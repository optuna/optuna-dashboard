import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  Typography,
  useTheme,
} from "@mui/material"
import * as Optuna from "@optuna/types"
import * as plotly from "plotly.js-dist-min"
import { PlotlyHTMLElement } from "plotly.js-dist-min"
import React, { FC, ReactNode, useEffect, useState } from "react"
import {
  GraphContainer,
  Target,
  useFilteredTrials,
  useGraphComponentState,
  useMergedUnionSearchSpace,
  useObjectiveAndUserAttrTargets,
  useParamTargets,
} from ".."
import { DarkColorTemplates } from "./PlotlyColorTemplates"

const plotDomId = "plot-parallel-coordinate"

interface PlotlyDimension {
  values: number[]
  constraintrange?: [number, number]
}

interface PlotlyParCoordTrace {
  dimensions: PlotlyDimension[]
  customdata: string[]
}

export const PlotParallelCoordinate: FC<{
  study: Optuna.Study | null
  colorTheme?: Partial<Plotly.Template>
  includeInfeasibleTrials?: boolean
  includeDominatedTrials?: boolean
  onSelectionChange?: (selectedTrials: number[]) => void
}> = ({
  study = null,
  colorTheme,
  includeInfeasibleTrials,
  includeDominatedTrials,
  onSelectionChange,
}) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorThemeUsed =
    colorTheme ??
    (theme.palette.mode === "dark" ? DarkColorTemplates.default : {})

  const [targets, searchSpace, renderCheckBoxes] = useTargets(study)

  const trials = useFilteredTrials(
    study,
    targets,
    false,
    includeInfeasibleTrials,
    includeDominatedTrials
  )
  useEffect(() => {
    if (study !== null && graphComponentState !== "componentWillMount") {
      // TODO(c-bata): Fix the broken E2E tests.
      // https://github.com/optuna/optuna-dashboard/pull/929#issuecomment-2296632106
      // https://github.com/optuna/optuna-dashboard/actions/runs/10451985071/job/28939493755?pr=937
      try {
        plotCoordinate(
          study,
          trials,
          targets,
          searchSpace,
          colorThemeUsed
        )?.then(notifyGraphDidRender)

        if (onSelectionChange) {
          const element = document.getElementById(plotDomId)
          if (element !== null) {
            //@ts-ignore
            element.on("plotly_restyle", () => {
              const plotlyElement = element as PlotlyHTMLElement
              const plotData = plotlyElement.data[0] as PlotlyParCoordTrace
              const dimensions = plotData.dimensions as PlotlyDimension[]
              const ranges = dimensions.map((dim) => dim.constraintrange)

              const selectedIndices = []
              const values = dimensions.map((dim) => dim.values)

              for (let i = 0; i < values[0].length; i++) {
                let isSelected = true
                for (let j = 0; j < values.length; j++) {
                  if (ranges[j]) {
                    const value = values[j][i]
                    const range = ranges[j]
                    if (range && (value < range[0] || value > range[1])) {
                      isSelected = false
                      break
                    }
                  }
                }
                if (isSelected) {
                  selectedIndices.push(i)
                }
              }

              const selectedData: number[] = selectedIndices.map((index) =>
                parseInt(plotData.customdata[index])
              )
              onSelectionChange(selectedData)
            })
            return () => {
              //@ts-ignore
              element.removeAllListeners("plotly_restyle")
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [
    study,
    trials,
    targets,
    searchSpace,
    colorThemeUsed,
    onSelectionChange,
    graphComponentState,
    notifyGraphDidRender,
  ])

  return (
    <Grid container direction="row">
      <Grid
        item
        xs={3}
        container
        direction="column"
        sx={{
          paddingRight: theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          Parallel Coordinate
        </Typography>
        {renderCheckBoxes()}
      </Grid>
      <Grid item xs={9}>
        <GraphContainer
          plotDomId={plotDomId}
          graphComponentState={graphComponentState}
        />
      </Grid>
    </Grid>
  )
}

const plotCoordinate = (
  study: Optuna.Study,
  trials: Optuna.Trial[],
  targets: Target[],
  searchSpace: Optuna.SearchSpaceItem[],
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 70,
      t: 50,
      r: 50,
      b: 100,
    },
    template: colorTheme,
    uirevision: "true",
  }
  if (trials.length === 0 || targets.length === 0) {
    return plotly.react(plotDomId, [], layout)
  }

  const maxLabelLength = 40
  const breakLength = maxLabelLength / 2
  const ellipsis = "…"
  const truncateLabelIfTooLong = (originalLabel: string): string => {
    return originalLabel.length > maxLabelLength
      ? originalLabel.substring(0, maxLabelLength - ellipsis.length) + ellipsis
      : originalLabel
  }
  const breakLabelIfTooLong = (originalLabel: string): string => {
    const truncated = truncateLabelIfTooLong(originalLabel)
    return truncated
      .split("")
      .map((c, i) => {
        return (i + 1) % breakLength === 0 ? `${c}<br>` : c
      })
      .join("")
  }

  const calculateLogScale = (values: number[]) => {
    const logValues = values.map((v) => {
      return Math.log10(v)
    })
    const minValue = Math.min(...logValues)
    const maxValue = Math.max(...logValues)
    const range = [Math.floor(minValue), Math.ceil(maxValue)]
    const tickvals = Array.from(
      { length: Math.ceil(maxValue) - Math.floor(minValue) + 1 },
      (_, i) => i + Math.floor(minValue)
    )
    const ticktext = tickvals.map((x) => `${(10 ** x).toPrecision(3)}`)
    return { logValues, range, tickvals, ticktext }
  }

  const dimensions = targets.map((target) => {
    if (target.kind === "objective" || target.kind === "user_attr") {
      const values: number[] = trials.map(
        (t) => target.getTargetValue(t) as number
      )
      return {
        label: target.toLabel(study.metric_names),
        values: values,
        range: [Math.min(...values), Math.max(...values)],
      }
    }
    const s = searchSpace.find(
      (s) => s.name === target.key
    ) as Optuna.SearchSpaceItem // Must be already filtered.

    const values: number[] = trials.map(
      (t) => target.getTargetValue(t) as number
    )
    if (s.distribution.type === "CategoricalDistribution") {
      // categorical
      const vocabArr: string[] = s.distribution.choices.map(
        (c) => c?.value ?? "null"
      )
      const tickvals: number[] = vocabArr.map((_, i) => i)
      return {
        label: breakLabelIfTooLong(s.name),
        values: values,
        range: [0, s.distribution.choices.length - 1],
        // @ts-ignore
        tickvals: tickvals,
        ticktext: vocabArr,
      }
    }
    if (s.distribution.log) {
      // numerical and log
      const { logValues, range, tickvals, ticktext } = calculateLogScale(values)
      return {
        label: breakLabelIfTooLong(s.name),
        values: logValues,
        range,
        tickvals,
        ticktext,
      }
    }
    // numerical and linear
    return {
      label: breakLabelIfTooLong(s.name),
      values: values,
      range: [s.distribution.low, s.distribution.high],
    }
  })
  if (dimensions.length === 0) {
    console.log("Must not reach here.")
    return plotly.react(plotDomId, [], layout)
  }
  let reversescale = false
  if (
    targets[0].kind === "objective" &&
    (targets[0].getObjectiveId() as number) < study.directions.length &&
    study.directions[targets[0].getObjectiveId() as number] === "maximize"
  ) {
    reversescale = true
  }
  const plotData: Partial<plotly.PlotData>[] = [
    {
      type: "parcoords",
      dimensions: dimensions,
      customdata: trials.map((t) => t.number),
      labelangle: 30,
      labelside: "bottom",
      line: {
        color: dimensions[0].values,
        // @ts-ignore
        colorscale: "Blues",
        colorbar: {
          title: targets[0].toLabel(study.metric_names),
        },
        showscale: true,
        reversescale: reversescale,
      },
    },
  ]

  return plotly.react(plotDomId, plotData, layout)
}

const useTargets = (
  study: Optuna.Study | null
): [Target[], Optuna.SearchSpaceItem[], () => ReactNode] => {
  const [targets1] = useObjectiveAndUserAttrTargets(study)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [targets2] = useParamTargets(searchSpace)
  const [checked, setChecked] = useState<boolean[]>([true])
  const [checkedAll, setCheckedAll] = useState<boolean>(true)

  const toggleCheckedAll = () => {
    if (checkedAll) {
      setChecked(checked.map(() => false))
    } else {
      setChecked(checked.map(() => true))
    }
    setCheckedAll((prevCheckedAll) => !prevCheckedAll)
  }

  const allTargets = [...targets1, ...targets2]
  useEffect(() => {
    if (allTargets.length !== checked.length) {
      setChecked(
        allTargets.map((t) => {
          if (t.kind === "user_attr") {
            return false
          }
          if (t.kind !== "params" || study === null) {
            return true
          }
          // By default, params that is not included in intersection search space should be disabled,
          // otherwise all trials are filtered.
          return (
            study.intersection_search_space.find((s) => s.name === t.key) !==
            undefined
          )
        })
      )
    }
  }, [allTargets, study, checked.length])

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(
      checked.map((c, i) =>
        i.toString() === event.target.name ? event.target.checked : c
      )
    )
  }

  const renderCheckBoxes = (): ReactNode => (
    <FormGroup>
      <FormControlLabel
        control={
          <Checkbox
            checked={checkedAll}
            onChange={toggleCheckedAll}
            name="checkedAll"
          />
        }
        label="Check All"
      />
      <Divider />
      <Box sx={{ maxHeight: "300px", overflowX: "hidden", overflowY: "auto" }}>
        {allTargets.map((t, i) => {
          const key = t.toLabel(study?.metric_names)
          return (
            <FormControlLabel
              sx={{ width: "100%" }}
              key={key}
              control={
                <Checkbox
                  checked={checked.length > i ? checked[i] : true}
                  onChange={handleOnChange}
                  name={i.toString()}
                />
              }
              label={t.toLabel(study?.metric_names)}
            />
          )
        })}
      </Box>
    </FormGroup>
  )

  const targets = allTargets.filter((_, i) =>
    checked.length > i ? checked[i] : true
  )
  return [targets, searchSpace, renderCheckBoxes]
}
