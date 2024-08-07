import { ReactWidget } from "@jupyterlab/ui-components"
import { APIClientProvider } from "@optuna/optuna-dashboard"
import React from "react"
import { JupyterlabAPIClient } from "./apiClient"
import { JupyterLabEntrypoint } from "./components/JupyterLabEntrypoint"

const jupyterlabAPIClient = new JupyterlabAPIClient()

export class OptunaDashboardWidget extends ReactWidget {
  constructor() {
    super()
    this.addClass("jp-react-widget")
  }

  render(): JSX.Element {
    return (
      <APIClientProvider apiClient={jupyterlabAPIClient}>
        <JupyterLabEntrypoint />
      </APIClientProvider>
    )
  }
}
