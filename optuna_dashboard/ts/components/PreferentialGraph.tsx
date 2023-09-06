import React, { FC, useState, useCallback, useMemo, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Typography,
  useTheme,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { BestTrialsCard } from "./BestTrialsCard"
import { useStudyDetailValue, useStudySummaryValue } from "../state"
import { Contour } from "./GraphContour"
import { MarkdownRenderer } from "./Note"
import ReactFlow, {
  addEdge,
  Node,
  NodeProps,
  NodeTypes,
  Edge,
  FitViewOptions,
  DefaultEdgeOptions,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Position,
  Handle,
} from "reactflow"
import "reactflow/dist/style.css"

const nodeWidth = 400
const nodeHeight = 300
type NodeData = {
  trial?: Trial
}
const GraphNode: FC<NodeProps<NodeData>> = ({ data, isConnectable }) => {
  const theme = useTheme()
  const trial = data.trial
  if (trial === undefined) {
    return null
  }
  const noteBody = trial.note.body
  const noteFC = useMemo(() => {
    return <MarkdownRenderer body={noteBody} />
  }, [noteBody])
  return (
    <Card
      sx={{
        width: nodeWidth,
        height: nodeHeight,
        overflow: "hidden",
      }}
    >
      <CardHeader title={`Trial ${trial.number}`} />
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#555" }}
        isConnectable={isConnectable}
      />
      <CardContent>{noteFC}</CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#555" }}
        isConnectable={isConnectable}
      />
    </Card>
  )
}

const nodeTypes: NodeTypes = {
  note: GraphNode,
}

const createNode = (x: number, y: number, trial: Trial): Node => {
  return {
    id: `${trial.number}`,
    type: "note",
    data: {
      label: `Trial ${trial.number}`,
      trial: trial,
    },
    position: {
      x: x * 500,
      y: y * 400,
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      padding: 0,
    },
  }
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

export const PreferentialGraph: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  if (studyDetail === null || !studyDetail.is_preferential) {
    return null
  }
  const [nodes, setNodes] = useState<Node[]>([])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  useEffect(() => {
    setNodes((prev) => {
      const newNodes: Node[] = []
      studyDetail.best_trials.forEach((trial, i) => {
        newNodes.push(createNode(i, 0, trial))
      })
      if (studyDetail.preference_history !== undefined) {
        const histories = [...studyDetail.preference_history]
        histories?.reverse().forEach((history, i) => {
          const y = history.candidates.findIndex((c) => c === history.clicked)
          newNodes.push(
            createNode(y, i + 1, studyDetail.trials[history.clicked])
          )
        })
      }
      return newNodes
    })
  }, [studyDetail])

  const edges: Edge[] =
    studyDetail.preferences?.map((p) => {
      return {
        id: `e${p[0]}-${p[1]}`,
        source: `${p[0]}`,
        target: `${p[1]}`,
        style: { stroke: "#fff" },
      } as Edge
    }) ?? []

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      defaultEdgeOptions={defaultEdgeOptions}
      nodeTypes={nodeTypes}
      zoomOnScroll={false}
      panOnScroll={true}
    />
  )
}
