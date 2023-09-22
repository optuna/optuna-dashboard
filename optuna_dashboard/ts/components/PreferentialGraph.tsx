import React, { FC, useState, useCallback, useEffect } from "react"
import {
  Card,
  CardContent,
  useTheme,
  Typography,
  Box,
  Chip,
} from "@mui/material"
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
} from "reactflow"
import "reactflow/dist/style.css"
import ELK from "elkjs/lib/elk.bundled.js"
import { ElkNode } from "elkjs/lib/elk-api.js"

import { useStudyDetailValue } from "../state"
import { getArtifactUrlPath } from "./PreferentialTrials"
import { PreferentialOutputComponent } from "./PreferentialOutputComponent"

const elk = new ELK()
const nodeWidth = 400
const nodeHeight = 300
const nodeMargin = 60

type NodeData = {
  trial?: Trial
  isBest: boolean
}
const GraphNode: FC<NodeProps<NodeData>> = ({ data, isConnectable }) => {
  const theme = useTheme()
  const trial = data.trial
  if (trial === undefined) {
    return null
  }
  const studyDetail = useStudyDetailValue(trial.study_id)
  const componentType = studyDetail?.feedback_component_type
  if (componentType === undefined) {
    return null
  }
  const artifactId =
    componentType.output_type === "artifact"
      ? trial.user_attrs.find((a) => a.key === componentType.artifact_key)
          ?.value
      : undefined
  const artifact = trial.artifacts.find((a) => a.artifact_id === artifactId)
  const urlPath =
    artifactId !== undefined
      ? getArtifactUrlPath(trial.study_id, trial.trial_id, artifactId)
      : ""

  return (
    <Card
      sx={{
        width: nodeWidth,
        height: nodeHeight,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          displayDirection: "row",
          margin: theme.spacing(2),
        }}
      >
        <Typography variant="h5">Trial {trial.number}</Typography>
        {data.isBest && (
          <Chip
            label={"Best Trial"}
            color="secondary"
            variant="outlined"
            sx={{
              marginLeft: "auto",
            }}
          />
        )}
      </Box>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#555" }}
        isConnectable={isConnectable}
      />
      <CardContent>
        <PreferentialOutputComponent
          trial={trial}
          artifact={artifact}
          componentType={componentType}
          urlPath={urlPath}
        />
      </CardContent>
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
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

const reductionPreference = (
  input_preferences: [number, number][]
): [number, number][] => {
  const preferences: [number, number][] = []
  let n = 0
  for (const [source, target] of input_preferences) {
    if (
      preferences.find((p) => p[0] === source && p[1] === target) !==
        undefined ||
      input_preferences.find((p) => p[0] === target && p[1] === source) !==
        undefined
    ) {
      continue
    }
    n = Math.max(n - 1, source, target) + 1
    preferences.push([source, target])
  }
  if (n === 0) {
    return []
  }
  const graph: number[][] = Array.from({ length: n }, () => [])
  const reverseGraph: number[][] = Array.from({ length: n }, () => [])
  const degree: number[] = Array.from({ length: n }, () => 0)
  for (const [source, target] of preferences) {
    graph[source].push(target)
    reverseGraph[target].push(source)
    degree[target]++
  }
  const topologicalOrder: number[] = []
  const q: number[] = []
  for (let i = 0; i < n; i++) {
    if (degree[i] === 0) {
      q.push(i)
    }
  }
  while (q.length > 0) {
    const v = q.pop()
    if (v === undefined) break
    topologicalOrder.push(v)
    graph[v].forEach((u) => {
      degree[u]--
      if (degree[u] === 0) {
        q.push(u)
      }
    })
  }
  if (topologicalOrder.length !== n) {
    console.error("cycle detected")
    return preferences
  }

  const response: [number, number][] = []
  const descendants: Set<number>[] = Array.from(
    { length: n },
    () => new Set<number>()
  )
  topologicalOrder.reverse().forEach((v) => {
    const descendant = new Set<number>([v])
    graph[v].forEach((u) => {
      descendants[u].forEach((d) => descendant.add(d))
    })
    graph[v].forEach((u) => {
      if (reverseGraph[u].filter((d) => descendant.has(d)).length === 1) {
        response.push([v, u])
      }
    })
    descendants[v] = descendant
  })
  return response
}

export const PreferentialGraph: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const theme = useTheme()
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )

  useEffect(() => {
    if (studyDetail === null) return
    if (!studyDetail.is_preferential || studyDetail.preferences === undefined)
      return
    const preferences = reductionPreference(studyDetail.preferences)
    const trialNodes = Array.from(new Set(preferences.flat()))
    const graph: ElkNode = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.layered.spacing.nodeNodeBetweenLayers": nodeMargin.toString(),
        "elk.spacing.nodeNode": nodeMargin.toString(),
      },
      children: trialNodes.map((trial) => ({
        id: `${trial}`,
        targetPosition: "top",
        sourcePosition: "bottom",
        width: nodeWidth,
        height: nodeHeight,
      })),
      edges: preferences.map(([source, target]) => ({
        id: `e${source}-${target}`,
        sources: [`${source}`],
        targets: [`${target}`],
      })),
    }
    elk
      .layout(graph)
      .then((layoutedGraph) => {
        setNodes(
          layoutedGraph.children?.map((node, index) => {
            const trial = studyDetail.trials[trialNodes[index]]
            return {
              id: `${trial.number}`,
              type: "note",
              data: {
                label: `Trial ${trial.number}`,
                trial: trial,
                isBest:
                  studyDetail.best_trials.find(
                    (t) => t.number === trial.number
                  ) !== undefined,
              },
              position: {
                x: node.x ?? 0,
                y: node.y ?? 0,
              },
              style: {
                width: nodeWidth,
                height: nodeHeight,
                padding: 0,
              },
              deletable: false,
              connectable: false,
              draggable: false,
            }
          }) ?? []
        )
      })
      .catch(console.error)
    setEdges(
      preferences.map((p) => {
        return {
          id: `e${p[0]}-${p[1]}`,
          source: `${p[0]}`,
          target: `${p[1]}`,
          style: { stroke: theme.palette.text.primary },
        } as Edge
      }) ?? []
    )
  }, [studyDetail, theme.palette.text.primary])

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
      minZoom={0.1}
      defaultViewport={{
        x: 0,
        y: 0,
        zoom: 0.5,
      }}
    >
      <MiniMap nodeStrokeWidth={1} zoomable pannable />
    </ReactFlow>
  )
}
