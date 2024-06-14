import { useEffect, useState } from "react"
import { GraphComponentState } from "../types"

export const useGraphComponentState = () => {
  const [graphComponentState, setGraphComponentState] =
    useState<GraphComponentState>("componentWillMount")
  useEffect(() => {
    setGraphComponentState("componentDidMount")
  }, [])
  return {
    graphComponentState,
    notifyGraphDidRender: () => setGraphComponentState("graphDidRender"),
  }
}
