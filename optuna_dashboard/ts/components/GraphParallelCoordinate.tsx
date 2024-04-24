import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  Typography,
  useTheme,
} from "@mui/material"
import * as plotly from "plotly.js-dist-min"
import React, { FC, ReactNode, useEffect, useState } from "react"
import { SearchSpaceItem, StudyDetail, Trial } from "ts/types/optuna"
import { PlotType } from "../apiClient"
import { useGraphComponentState } from "../hooks/useGraphComponentState"
import { usePlot } from "../hooks/usePlot"
import { useMergedUnionSearchSpace } from "../searchSpace"
import { usePlotlyColorTheme } from "../state"
import { useBackendRender } from "../state"
import {
  Target,
  useFilteredTrials,
  useObjectiveAndUserAttrTargets,
  useParamTargets,
} from "../trialFilter"
import GraphContainer from "./GraphContainer"

const plotDomId = "graph-parallel-coordinate"

const useTargets = (
  study: StudyDetail | null
): [Target[], SearchSpaceItem[], () => ReactNode] => {
  const [targets1] = useObjectiveAndUserAttrTargets(study)
  const searchSpace = useMergedUnionSearchSpace(study?.union_search_space)
  const [targets2] = useParamTargets(searchSpace)
  const [checked, setChecked] = useState<boolean[]>([true])

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
  }, [allTargets])

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(
      checked.map((c, i) =>
        i.toString() === event.target.name ? event.target.checked : c
      )
    )
  }

  const renderCheckBoxes = (): ReactNode => (
    <FormGroup>
      {allTargets.map((t, i) => {
        return (
          <FormControlLabel
            key={i}
            control={
              <Checkbox
                checked={checked.length > i ? checked[i] : true}
                onChange={handleOnChange}
                name={i.toString()}
              />
            }
            label={t.toLabel(study?.objective_names)}
          />
        )
      })}
    </FormGroup>
  )

  const targets = allTargets.filter((t, i) =>
    checked.length > i ? checked[i] : true
  )
  return [targets, searchSpace, renderCheckBoxes]
}

export const GraphParallelCoordinate: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  if (useBackendRender()) {
    return <GraphParallelCoordinateBackend study={study} />
  } else {
    return <GraphParallelCoordinateFrontend study={study} />
  }
}

const GraphParallelCoordinateBackend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const studyId = study?.id
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0

  const { data, layout, error } = usePlot({
    numCompletedTrials,
    studyId,
    plotType: PlotType.ParallelCoordinate,
  })

  useEffect(() => {
    if (data && layout && graphComponentState !== "componentWillMount") {
      plotly.react(plotDomId, data, layout).then(notifyGraphDidRender)
    }
  }, [data, layout, graphComponentState])
  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  return (
    <GraphContainer
      plotDomId={plotDomId}
      graphComponentState={graphComponentState}
    />
  )
}

const GraphParallelCoordinateFrontend: FC<{
  study: StudyDetail | null
}> = ({ study = null }) => {
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  const [targets, searchSpace, renderCheckBoxes] = useTargets(study)

  const trials = useFilteredTrials(study, targets, false)
  useEffect(() => {
    if (study !== null && graphComponentState !== "componentWillMount") {
      plotCoordinate(study, trials, targets, searchSpace, colorTheme)?.then(
        notifyGraphDidRender
      )
    }
  }, [study, trials, targets, searchSpace, colorTheme, graphComponentState])

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
  study: StudyDetail,
  trials: Trial[],
  targets: Target[],
  searchSpace: SearchSpaceItem[],
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
        return (i + 1) % breakLength === 0 ? c + "<br>" : c
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
    const ticktext = tickvals.map((x) => `${Math.pow(10, x).toPrecision(3)}`)
    return { logValues, range, tickvals, ticktext }
  }

  const dimensions = targets.map((target) => {
    if (target.kind === "objective" || target.kind === "user_attr") {
      const values: number[] = trials.map(
        (t) => target.getTargetValue(t) as number
      )
      return {
        label: target.toLabel(study.objective_names),
        values: values,
        range: [Math.min(...values), Math.max(...values)],
      }
    } else {
      const s = searchSpace.find(
        (s) => s.name === target.key
      ) as SearchSpaceItem // Must be already filtered.

      const values: number[] = trials.map(
        (t) => target.getTargetValue(t) as number
      )
      if (s.distribution.type === "CategoricalDistribution") {
        // categorical
        const vocabArr: string[] = s.distribution.choices.map(
          (c) => c?.toString() ?? "null"
        )
        const tickvals: number[] = vocabArr.map((v, i) => i)
        return {
          label: breakLabelIfTooLong(s.name),
          values: values,
          range: [0, s.distribution.choices.length - 1],
          // @ts-ignore
          tickvals: tickvals,
          ticktext: vocabArr,
        }
      } else if (s.distribution.log) {
        // numerical and log
        const { logValues, range, tickvals, ticktext } =
          calculateLogScale(values)
        return {
          label: breakLabelIfTooLong(s.name),
          values: logValues,
          range,
          tickvals,
          ticktext,
        }
      } else {
        // numerical and linear
        return {
          label: breakLabelIfTooLong(s.name),
          values: values,
          range: [s.distribution.low, s.distribution.high],
        }
      }
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
      labelangle: 30,
      labelside: "bottom",
      line: {
        color: dimensions[0]["values"],
        // @ts-ignore
        colorscale: "Blues",
        colorbar: {
          title: targets[0].toLabel(study.objective_names),
        },
        showscale: true,
        reversescale: reversescale,
      },
    },
  ]

  return plotly.react(plotDomId, plotData, layout)
}
