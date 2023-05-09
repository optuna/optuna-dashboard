import React, { FC, useMemo, useState } from "react"
import {
  Typography,
  Box,
  useTheme,
  Card,
  FormControlLabel,
  FormControl,
  FormLabel,
  Button,
  RadioGroup,
  Radio,
  Slider,
  TextField,
} from "@mui/material"
import { DebouncedInputTextField } from "./Debounce"
import { actionCreator } from "../action"

export const ObjectiveForm: FC<{
  trial: Trial
  directions: StudyDirection[]
  names: string[]
  formWidgets: FormWidgets
}> = ({ trial, directions, names, formWidgets }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [values, setValues] = useState<(number | string)[]>(
    formWidgets.widgets.map((widget) => {
      if (widget.type === "text") {
        return ""
      } else if (widget.type === "choice") {
        const value = widget.values.at(0)
        if (value === undefined) {
          console.error("Must not reach ehere")
          return 0
        }
        return value
      } else if (widget.type === "slider") {
        return widget.min
      } else if (widget.type === "user_attr") {
        const attr = trial.user_attrs.find((attr) => attr.key == widget.key)
        if (attr === undefined) {
          return 0
        } else {
          const n = Number(attr.value)
          return isNaN(n) ? 0 : n
        }
      } else {
        console.error("Must not reach here")
        return ""
      }
    })
  )

  const setValue = (objectiveId: number, value: number | string) => {
    const newValues = [...values]
    if (newValues.length <= objectiveId) {
      return
    }
    newValues[objectiveId] = value
    setValues(newValues)
  }

  const disableSubmit = useMemo<boolean>(
    () =>
      values.findIndex((v, i) => {
        const w = formWidgets.widgets[i]
        if (
          formWidgets.output_type === "user_attr" &&
          w.type === "text" &&
          w.optional
        ) {
          return false
        }
        return v === null
      }) >= 0,
    [values, formWidgets]
  )

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    if (formWidgets.output_type == "objective") {
      const filtered = values.filter<number>((v): v is number => v !== null)
      if (filtered.length !== directions.length) {
        return
      }
      action.makeTrialComplete(trial.study_id, trial.trial_id, filtered)
    } else if (formWidgets.output_type == "user_attr") {
      const user_attrs = Object.fromEntries(
        formWidgets.widgets.map((widget, i) => [
          widget.user_attr_key,
          values[i] !== null ? values[i] : "",
        ])
      )
      action.saveTrialUserAttrs(trial.study_id, trial.trial_id, user_attrs)
    }
  }

  const getMetricName = (i: number): string => {
    if (formWidgets.output_type == "objective") {
      const n = names.at(i)
      if (n !== undefined) {
        return n
      }
      if (directions.length == 1) {
        return `Objective`
      } else {
        return `Objective ${i}`
      }
    } else if (formWidgets.output_type == "user_attr") {
      return formWidgets.widgets[i].user_attr_key as string
    }
    return "Unkown metric name"
  }

  const headerText =
    formWidgets.output_type === "user_attr"
      ? "Set User Attributes Form"
      : directions.length > 1
      ? "Set Objective Values Form"
      : "Set Objective Value Form"

  return (
    <>
      <Typography
        variant="h5"
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        {headerText}
      </Typography>
      <Box sx={{ p: theme.spacing(1, 0) }}>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            marginBottom: theme.spacing(2),
            margin: theme.spacing(0, 1, 1, 0),
            p: theme.spacing(1),
          }}
        >
          {formWidgets.widgets.map((widget, i) => {
            const value = values.at(i) || ""
            const key = `objective-${i}`
            if (widget.type === "text") {
              return (
                <TextInputWidget
                  key={key}
                  metricName={getMetricName(i)}
                  widget={widget}
                  widgetType={formWidgets.output_type}
                  setValue={(value) => {
                    setValue(i, value)
                  }}
                  value={value}
                />
              )
            } else if (widget.type === "choice") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getMetricName(i)} - {widget.description}
                  </FormLabel>
                  <RadioGroup row defaultValue={widget.values.at(0)}>
                    {widget.choices.map((c, j) => (
                      <FormControlLabel
                        key={c}
                        control={
                          <Radio
                            checked={value === widget.values.at(j)}
                            onChange={(e) => {
                              const selected = widget.values.at(j)
                              if (selected === undefined) {
                                console.error("Must not reach here.")
                              }
                              if (e.target.checked) {
                                setValue(i, selected || 0)
                              }
                            }}
                          />
                        }
                        label={c}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )
            } else if (widget.type === "slider") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getMetricName(i)} - {widget.description}
                  </FormLabel>
                  <Box sx={{ padding: theme.spacing(0, 2) }}>
                    <Slider
                      onChange={(e) => {
                        // @ts-ignore
                        setValue(i, e.target.value as number)
                      }}
                      defaultValue={widget.min}
                      min={widget.min}
                      max={widget.max}
                      step={widget.step}
                      marks={
                        widget.labels === null || widget.labels.length == 0
                          ? true
                          : widget.labels
                      }
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </FormControl>
              )
            } else if (widget.type === "user_attr") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>{getMetricName(i)}</FormLabel>
                  <TextField
                    inputProps={{ readOnly: true }}
                    value={value || undefined}
                    error={value === null}
                    helperText={
                      value === null || value === undefined
                        ? `This objective value is referred from trial.user_attrs[${widget.key}].`
                        : ""
                    }
                  />
                </FormControl>
              )
            }
            return null
          })}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              margin: theme.spacing(1, 2),
            }}
          >
            <Button
              variant="contained"
              type="submit"
              sx={{ marginRight: theme.spacing(1) }}
              disabled={disableSubmit}
              onClick={handleSubmit}
            >
              Submit
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                action.makeTrialFail(trial.study_id, trial.trial_id)
              }}
            >
              Fail Trial
            </Button>
          </Box>
        </Card>
      </Box>
    </>
  )
}

const TextInputWidget: FC<{
  widget: ObjectiveTextInputWidget
  widgetType: "user_attr" | "objective"
  metricName: string
  value: number | string
  setValue: (value: number | string) => void
}> = ({ widget, widgetType, metricName, value, setValue }) => {
  const theme = useTheme()
  const inputProps =
    widgetType === "objective"
      ? {
          pattern: "[-+]?[0-9]*.?[0-9]+([eE][-+]?[0-9]+)?",
        }
      : undefined
  const helperText =
    !widget.optional && value === "" ? `Please input the float number.` : ""

  return (
    <FormControl sx={{ margin: theme.spacing(1, 2) }}>
      <FormLabel>
        {metricName} - {widget.description}
      </FormLabel>
      <DebouncedInputTextField
        onChange={(s, valid) => {
          if (widgetType === "user_attr") {
            setValue(s)
            return
          }

          const n = Number(s)
          if (s.length > 0 && valid && !isNaN(n)) {
            setValue(n)
          } else if (value === "") {
            setValue("")
          }
        }}
        delay={500}
        textFieldProps={{
          type: "text",
          autoFocus: true,
          fullWidth: true,
          required: !widget.optional,
          helperText,
          inputProps,
        }}
      />
    </FormControl>
  )
}

export const ReadonlyObjectiveForm: FC<{
  trial: Trial
  directions: StudyDirection[]
  names: string[]
  formWidgets: FormWidgets
}> = ({ trial, directions, names, formWidgets }) => {
  const theme = useTheme()
  const getMetricName = (i: number): string => {
    if (formWidgets.output_type == "objective") {
      const n = names.at(i)
      if (n !== undefined) {
        return n
      }
      if (directions.length == 1) {
        return `Objective`
      } else {
        return `Objective ${i}`
      }
    } else if (formWidgets.output_type == "user_attr") {
      return formWidgets.widgets[i].user_attr_key as string
    }
    return "Unkown metric name"
  }

  const getValue = (i: number): string | TrialValueNumber => {
    if (formWidgets.output_type === "user_attr") {
      const widget = formWidgets.widgets[i] as UserAttrFormWidget
      return (
        trial.user_attrs.find((attr) => attr.key === widget.user_attr_key)
          ?.value || ""
      )
    }
    const value = trial.values?.at(i)
    if (value === undefined) {
      console.error("Must not reach here.")
      return 0
    }
    return value
  }

  return (
    <>
      <Typography
        variant="h5"
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        {directions.length > 1 ? "Set Objective Values" : "Set Objective Value"}
      </Typography>
      <Box sx={{ p: theme.spacing(1, 0) }}>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            marginBottom: theme.spacing(2),
            margin: theme.spacing(0, 1, 1, 0),
            p: theme.spacing(1),
          }}
        >
          {formWidgets.widgets.map((widget, i) => {
            const key = `objective-${i}`
            if (widget.type === "text") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getMetricName(i)} - {widget.description}
                  </FormLabel>
                  <TextField
                    inputProps={{ readOnly: true }}
                    value={getValue(i)}
                  />
                </FormControl>
              )
            } else if (widget.type === "choice") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getMetricName(i)} - {widget.description}
                  </FormLabel>
                  <RadioGroup row defaultValue={trial.values?.at(i)}>
                    {widget.choices.map((c, j) => (
                      <FormControlLabel
                        key={c}
                        control={
                          <Radio
                            checked={
                              trial.values?.at(i) === widget.values.at(j)
                            }
                          />
                        }
                        label={c}
                        disabled
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              )
            } else if (widget.type === "slider") {
              const value = trial.values?.at(i)
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getMetricName(i)} - {widget.description}
                  </FormLabel>
                  <Box sx={{ padding: theme.spacing(0, 2) }}>
                    <Slider
                      defaultValue={
                        value === "inf" || value === "-inf" ? undefined : value
                      }
                      min={widget.min}
                      max={widget.max}
                      step={widget.step}
                      marks={
                        widget.labels === null || widget.labels.length == 0
                          ? true
                          : widget.labels
                      }
                      valueLabelDisplay="auto"
                      disabled
                    />
                  </Box>
                </FormControl>
              )
            } else if (widget.type === "user_attr") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>{getMetricName(i)}</FormLabel>
                  <TextField
                    inputProps={{ readOnly: true }}
                    value={trial.values?.at(i)}
                  />
                </FormControl>
              )
            }
            return null
          })}
        </Card>
      </Box>
    </>
  )
}
