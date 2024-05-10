import * as Optuna from "@optuna/types"
import { useEffect, useState } from "react"

export const useGraphComponentState = () => {
  const [graphComponentState, setGraphComponentState] =
    useState<Optuna.GraphComponentState>("componentWillMount")
  useEffect(() => {
    setGraphComponentState("componentDidMount")
  }, [])
  return {
    graphComponentState,
    notifyGraphDidRender: () => setGraphComponentState("graphDidRender"),
  }
}
