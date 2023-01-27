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
  widgets: ObjectiveFormWidget[]
}> = ({ trial, directions, names, widgets }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [values, setValues] = useState<(number | null)[]>(
    directions.map((d, i) => {
      const widget = widgets.at(i)
      if (widget === undefined) {
        return null
      } else if (widget.type === "text") {
        return null
      } else if (widget.type === "choice") {
        return widget.values.at(0) || null
      } else if (widget.type === "slider") {
        return widget.min
      } else if (widget.type === "user_attr") {
        const attr = trial.user_attrs.find((attr) => attr.key == widget.key)
        if (attr === undefined) {
          return null
        } else {
          const n = Number(attr.value)
          return isNaN(n) ? null : n
        }
      } else {
        return null
      }
    })
  )

  const setValue = (objectiveId: number, value: number | null) => {
    const newValues = [...values]
    if (newValues.length <= objectiveId) {
      return
    }
    newValues[objectiveId] = value
    setValues(newValues)
  }

  const disableSubmit = useMemo<boolean>(
    () => values.findIndex((v) => v === null) >= 0,
    [values]
  )

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    const filtered = values.filter<number>((v): v is number => v !== null)
    if (filtered.length !== directions.length) {
      return
    }
    action.tellTrial(trial.study_id, trial.trial_id, "Complete", filtered)
  }

  const getObjectiveName = (i: number): string => {
    const n = names.at(i)
    if (n !== undefined) {
      return n
    }
    if (directions.length == 1) {
      return `Objective`
    } else {
      return `Objective ${i}`
    }
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
          {directions.map((d, i) => {
            const widget = widgets.at(i)
            const value = values.at(i)
            const key = `objective-${i}`
            if (widget === undefined) {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>{getObjectiveName(i)}</FormLabel>
                  <DebouncedInputTextField
                    onChange={(s, valid) => {
                      const n = Number(s)
                      if (s.length > 0 && valid && !isNaN(n)) {
                        setValue(i, n)
                        return
                      } else if (values.at(i) !== null) {
                        setValue(i, null)
                      }
                    }}
                    delay={500}
                    textFieldProps={{
                      required: true,
                      autoFocus: true,
                      fullWidth: true,
                      helperText:
                        value === null || value === undefined
                          ? `Please input the float number.`
                          : "",
                      label: getObjectiveName(i),
                      type: "text",
                    }}
                  />
                </FormControl>
              )
            } else if (widget.type === "text") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getObjectiveName(i)} - {widget.description}
                  </FormLabel>
                  <DebouncedInputTextField
                    onChange={(s, valid) => {
                      const n = Number(s)
                      if (s.length > 0 && valid && !isNaN(n)) {
                        setValue(i, n)
                        return
                      } else if (values.at(i) !== null) {
                        setValue(i, null)
                      }
                    }}
                    delay={500}
                    textFieldProps={{
                      required: true,
                      autoFocus: true,
                      fullWidth: true,
                      helperText:
                        value === null || value === undefined
                          ? `Please input the float number.`
                          : "",
                      type: "text",
                      inputProps: {
                        pattern: "[-+]?[0-9]*.?[0-9]+([eE][-+]?[0-9]+)?",
                      },
                    }}
                  />
                </FormControl>
              )
            } else if (widget.type === "choice") {
              return (
                <FormControl key={key} sx={{ margin: theme.spacing(1, 2) }}>
                  <FormLabel>
                    {getObjectiveName(i)} - {widget.description}
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
                              if (e.target.checked) {
                                setValue(
                                  i,
                                  selected === undefined ? null : selected
                                )
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
                    {getObjectiveName(i)} - {widget.description}
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
                  <FormLabel>{getObjectiveName(i)}</FormLabel>
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
                action.tellTrial(trial.study_id, trial.trial_id, "Fail")
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
