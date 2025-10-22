import ClearIcon from "@mui/icons-material/Clear"
import { LoadingButton } from "@mui/lab"
import {
  Box,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { Stack } from "@mui/system"
import { GraphContainer, useGraphComponentState } from "@optuna/react"
import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect, useState } from "react"
import { useGeneratePlotlyGraphQuery } from "../hooks/useGeneratePlotlyGraphQuery"
import { usePlotlyColorTheme } from "../state"
import { StudyDetail } from "../types/optuna"

const plotDomIdPrefix = "graph-by-llm"

const plotByLLM = (
  plotDomId: string,
  plotData: plotly.PlotData[],
  colorTheme: Partial<Plotly.Template>
) => {
  if (document.getElementById(plotDomId) === null) {
    return
  }

  const layout: Partial<plotly.Layout> = {
    margin: {
      l: 50,
      t: 0,
      r: 50,
      b: 50,
    },
    uirevision: "true",
    template: colorTheme,
  }
  return plotly.react(plotDomId, plotData, layout)
}

const GraphByLLMItem: FC<{
  plotDomId: string
  title: string
  plotData: plotly.PlotData[]
  onDelete: () => void
}> = ({ plotDomId, title, plotData, onDelete }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  useEffect(() => {
    if (plotData.length > 0) {
      plotByLLM(plotDomId, plotData, colorTheme)?.then(notifyGraphDidRender)
    }
  }, [plotData, colorTheme])

  if (plotData.length === 0) return null

  return (
    <Card>
      <CardContent sx={{ position: "relative", padding: theme.spacing(1) }}>
        <IconButton
          aria-label="close graph"
          size="small"
          onClick={onDelete}
          sx={{
            position: "absolute",
            top: theme.spacing(0.5),
            right: theme.spacing(0.5),
          }}
        >
          <ClearIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            margin: theme.spacing(1),
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
          {title}
        </Typography>
        <GraphContainer
          plotDomId={plotDomId}
          graphComponentState={graphComponentState}
        />
      </CardContent>
    </Card>
  )
}

export const GraphByLLM: FC<{
  study: StudyDetail | null
}> = ({ study }) => {
  const theme = useTheme()
  const [generatePlotlyGraph, renderIframe, isProcessing] =
    useGeneratePlotlyGraphQuery({
      nRetry: 3,
    })
  const [graphs, setGraphs] = useState<
    { id: string; title: string; plotData: plotly.PlotData[] }[]
  >([])
  const [queryInput, setQueryInput] = useState("")

  return (
    <Stack
      spacing={2}
      sx={{
        margin: theme.spacing(2),
      }}
    >
      {renderIframe()}
      {graphs.map(
        (graph) =>
          graph.plotData.length > 0 && (
            <GraphByLLMItem
              key={graph.id}
              plotDomId={`${plotDomIdPrefix}-${graph.id}`}
              title={graph.title}
              plotData={graph.plotData}
              onDelete={() =>
                setGraphs((prev) => prev.filter((g) => g.id !== graph.id))
              }
            />
          )
      )}
      <Box sx={{ display: "flex" }}>
        <TextField
          id="graph-by-llm-query"
          variant="outlined"
          placeholder="Enter your query to generate a graph, e.g., 'Plot objective value vs trial number'"
          fullWidth
          size="small"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          slotProps={{
            input: {
              endAdornment: queryInput && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="clear filter"
                    onClick={() => setQueryInput("")}
                    edge="end"
                    size="small"
                    disabled={isProcessing}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <LoadingButton
          sx={{ marginLeft: theme.spacing(2) }}
          variant="contained"
          loading={isProcessing}
          disabled={queryInput.trim() === ""}
          onClick={() => {
            if (study === null) return
            generatePlotlyGraph(study, queryInput).then((result) => {
              setGraphs((prev) => [
                ...prev,
                {
                  id: String(new Date().getTime()),
                  title: result.graphTitle,
                  plotData: result.plotData,
                },
              ])
            })
          }}
        >
          Generate
        </LoadingButton>
      </Box>
    </Stack>
  )
}
