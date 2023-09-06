import React, { FC, useState, useCallback, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, useTheme } from "@mui/material"
import { MarkdownRenderer } from "./Note"
import ReactFlow, {
  Node,
  NodeProps,
  NodeTypes,
  Edge,
  DefaultEdgeOptions,
  applyNodeChanges,
  OnNodesChange,
  MiniMap,
  Position,
  Handle,
  XYPosition,
} from "reactflow"
import "reactflow/dist/style.css"

const nodeWidth = 400
const nodeHeight = 300
const nodeMargin = 50
type NodeData = {
  trial?: Trial
}
const GraphNode: FC<NodeProps<NodeData>> = ({ data, isConnectable }) => {
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

const createNode = (
  x: number,
  y: number,
  trial: Trial,
  bestGroupPos: XYPosition,
  isBest: boolean
): Node => {
  return {
    id: `${trial.number}`,
    type: "note",
    data: {
      label: `Trial ${trial.number}`,
      trial: trial,
    },
    position: {
      x: bestGroupPos.x + nodeMargin + x * (nodeWidth + nodeMargin),
      y: bestGroupPos.y + nodeMargin + y * (nodeHeight + nodeMargin),
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      padding: 0,
    },
    parentNode: isBest ? "bestGroup" : undefined,
  }
}
const updateNode = (
  addX: number,
  addY: number,
  node: Node,
  trial: Trial,
  isBest: boolean
): Node => {
  return {
    ...node,
    position: {
      x: node.position.x + addX * (nodeWidth + nodeMargin),
      y: node.position.y + addY * (nodeHeight + nodeMargin),
    },
    data: {
      ...node.data,
      trial: trial,
    },
    parentNode: isBest ? "bestGroup" : undefined,
  }
}

const initNodes: Node[] = [
  {
    id: "bestGroup",
    type: "default",
    position: {
      x: 0,
      y: 0,
    },
    data: {
      label: "Best Trials",
    },
    style: {
      width: 2 * nodeMargin,
      height: nodeHeight + 2 * nodeMargin,
      padding: 0,
      backgroundColor: "rgb(255,0,0,0.1)",
    },
  },
]

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

export const PreferentialGraph: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const theme = useTheme()
  const [nodes, setNodes] = useState<Node[]>(initNodes)
  const [edges, setEdges] = useState<Edge[]>([])
  const [historyCount, setHistoryCount] = useState(0)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  const isDarkMode = theme.palette.mode === "dark"

  useEffect(() => {
    if (studyDetail === null) return
    const newHistoryCount =
      (studyDetail.preference_history?.length ?? 0) - historyCount
    if (newHistoryCount === 0) return

    setNodes((prev) => {
      const newNodes: Node[] = []
      const appendIds: string[] = studyDetail.best_trials.map((t) =>
        t.number.toString()
      ) // 新しく追加する Node の id, これと "bestGroup" 以外は newHistoryCount だけ下にスライドする
      studyDetail.preference_history?.slice(historyCount).forEach((history) => {
        appendIds.push(history.clicked.toString())
      })

      const bestGroup = prev.find((node) => node.id === "bestGroup")
      const bestGroupPos = bestGroup?.position ?? { x: 0, y: 0 }
      console.log(bestGroupPos)
      if (bestGroup !== undefined) {
        newNodes.push({
          ...bestGroup,
          style: {
            ...bestGroup.style,
            width:
              nodeMargin +
              studyDetail.best_trials.length * (nodeWidth + nodeMargin),
            background: "rgb(255,200,200,0.1)",
          },
        })
      }

      prev.forEach((node) => {
        if (appendIds.includes(node.id)) return
        if (node.id === "bestGroup") return
        const trialNum = parseInt(node.id, 10)
        if (node.id !== `${trialNum}`) {
          console.error(`node.id is not trual number: ${node.id}`)
          return
        }
        const trial = studyDetail.trials[trialNum]
        newNodes.push(updateNode(0, newHistoryCount, node, trial, false))
      })
      const histories = studyDetail.preference_history?.slice(historyCount)
      histories?.reverse().forEach((history, i) => {
        const x = history.candidates.findIndex((c) => c === history.clicked)
        newNodes.push(
          createNode(
            x,
            i + 1,
            studyDetail.trials[history.clicked],
            bestGroupPos,
            false
          )
        )
      })
      studyDetail.best_trials.forEach((trial, i) => {
        newNodes.push(createNode(i, 0, trial, bestGroupPos, true))
      })
      return newNodes
    })
    setHistoryCount(studyDetail.preference_history?.length ?? 0)
  }, [studyDetail])
  useEffect(() => {
    if (studyDetail?.preferences === undefined) return
    setEdges(
      studyDetail?.preferences?.map((p) => {
        return {
          id: `e${p[0]}-${p[1]}`,
          source: `${p[0]}`,
          target: `${p[1]}`,
          style: { stroke: isDarkMode ? "#fff" : "#000" },
        } as Edge
      }) ?? []
    )
  }, [studyDetail?.preferences, isDarkMode])

  if (studyDetail === null || !studyDetail.is_preferential) {
    return null
  }
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      defaultEdgeOptions={defaultEdgeOptions}
      nodeTypes={nodeTypes}
      zoomOnScroll={false}
      panOnScroll={true}
    >
      <MiniMap nodeStrokeWidth={1} zoomable pannable />
    </ReactFlow>
  )
}
