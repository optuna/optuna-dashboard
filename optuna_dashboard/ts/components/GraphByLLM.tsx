import DeleteIcon from "@mui/icons-material/Delete"
import EditRoadIcon from "@mui/icons-material/EditRoad"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { LoadingButton } from "@mui/lab"
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import { SmartTextField } from "./SmartTextField"

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
  id: string
  plotDomId: string
  title: string
  plotData: plotly.PlotData[]
  onDelete: () => void
  reGeneratePlotlyGraph: (reGeneratePlotlyGraphQueryStr: string) => void
  isReGeneratingPlotlyGraph: boolean
}> = ({
  id,
  plotDomId,
  title,
  plotData,
  onDelete,
  reGeneratePlotlyGraph,
  isReGeneratingPlotlyGraph,
}) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const { graphComponentState, notifyGraphDidRender } = useGraphComponentState()

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(menuAnchorEl)

  const [isEditingGraph, setIsEditingGraph] = useState(false)
  const [queryInput, setQueryInput] = useState("")

  useEffect(() => {
    if (plotData.length > 0) {
      setIsEditingGraph(false)
      plotByLLM(plotDomId, plotData, colorTheme)?.then(notifyGraphDidRender)
    }
  }, [plotData, colorTheme])

  if (plotData.length === 0) return null

  return (
    <Card>
      <CardContent sx={{ position: "relative", padding: theme.spacing(1) }}>
        <IconButton
          aria-label="close graph"
          aria-controls={openMenu ? `graph-by-llm-item-menu-${id}` : undefined}
          aria-haspopup="true"
          aria-expanded={openMenu ? "true" : undefined}
          size="small"
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            setMenuAnchorEl(event.currentTarget)
          }}
          sx={{
            position: "absolute",
            top: theme.spacing(0.5),
            right: theme.spacing(0.5),
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={menuAnchorEl}
          id={`graph-by-llm-item-menu-${id}`}
          open={openMenu}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem onClick={onDelete}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setIsEditingGraph(true)
              setMenuAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <EditRoadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        </Menu>

        <Typography
          variant="h6"
          sx={{
            margin: theme.spacing(1),
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
          {title}
        </Typography>

        {isEditingGraph && (
          <Box sx={{ display: "flex", marginBottom: theme.spacing(2) }}>
            <SmartTextField
              id={`graph-by-llm-item-query-${id}`}
              value={queryInput}
              setValue={setQueryInput}
              variant="outlined"
              placeholder="Enter the part you want to edit in the graph"
              fullWidth
              size="small"
              clearButtonDisabled={isReGeneratingPlotlyGraph}
              handleSubmit={() => {
                reGeneratePlotlyGraph(queryInput)
              }}
            />
            <Button
              sx={{ marginLeft: theme.spacing(1) }}
              variant="outlined"
              onClick={() => {
                setIsEditingGraph(false)
                setQueryInput("")
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              sx={{ marginLeft: theme.spacing(1) }}
              variant="contained"
              loading={isReGeneratingPlotlyGraph}
              disabled={queryInput.trim() === ""}
              onClick={() => {
                reGeneratePlotlyGraph(queryInput)
              }}
            >
              Regenerate
            </LoadingButton>
          </Box>
        )}

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
  const {
    render,
    generatePlotlyGraph,
    isGeneratePlotlyGraphLoading: isProcessing,
    reGeneratePlotlyGraph,
    isReGeneratePlotlyGraphLoading,
  } = useGeneratePlotlyGraphQuery({
    nRetry: 3,
  })
  const [graphs, setGraphs] = useState<
    {
      id: string
      functionStr: string
      title: string
      plotData: plotly.PlotData[]
    }[]
  >([])
  const [queryInput, setQueryInput] = useState("")

  const handleSubmit = () => {
    if (study === null) return
    generatePlotlyGraph(study, queryInput).then((result) => {
      setGraphs((prev) => [
        ...prev,
        {
          id: String(new Date().getTime()),
          functionStr: result.functionStr,
          title: result.graphTitle,
          plotData: result.plotData,
        },
      ])
    })
  }

  return (
    <Stack
      spacing={2}
      sx={{
        margin: theme.spacing(2),
      }}
    >
      {render()}
      {graphs.map(
        (graph) =>
          graph.plotData.length > 0 && (
            <GraphByLLMItem
              key={graph.id}
              id={graph.id}
              plotDomId={`${plotDomIdPrefix}-${graph.id}`}
              title={graph.title}
              plotData={graph.plotData}
              onDelete={() =>
                setGraphs((prev) => prev.filter((g) => g.id !== graph.id))
              }
              reGeneratePlotlyGraph={(
                reGeneratePlotlyGraphQueryStr: string
              ) => {
                if (study === null) return
                reGeneratePlotlyGraph(
                  study,
                  graph.functionStr,
                  reGeneratePlotlyGraphQueryStr
                ).then((result) => {
                  setGraphs((prev) =>
                    prev.map((g) => {
                      if (g.id !== graph.id) return g
                      if (
                        result.plotData.length === 0 &&
                        result.functionStr === ""
                      ) {
                        // If the regeneration was cancelled, keep the previous graph
                        return g
                      }
                      return {
                        id: g.id,
                        title: g.title,
                        functionStr: result.functionStr,
                        plotData: result.plotData,
                      }
                    })
                  )
                })
              }}
              isReGeneratingPlotlyGraph={isReGeneratePlotlyGraphLoading}
            />
          )
      )}
      <Box sx={{ display: "flex" }}>
        <SmartTextField
          id="graph-by-llm-query"
          variant="outlined"
          placeholder="Enter your query to generate a graph, e.g., 'Plot objective value vs trial number'"
          fullWidth
          size="small"
          value={queryInput}
          setValue={setQueryInput}
          clearButtonDisabled={isProcessing}
          handleSubmit={handleSubmit}
        />
        <LoadingButton
          sx={{ marginLeft: theme.spacing(2) }}
          variant="contained"
          loading={isProcessing}
          disabled={queryInput.trim() === ""}
          onClick={handleSubmit}
        >
          Generate
        </LoadingButton>
      </Box>
    </Stack>
  )
}
