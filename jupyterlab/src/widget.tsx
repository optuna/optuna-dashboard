import { Message } from "@lumino/messaging"
import { Widget } from "@lumino/widgets"
import React from "react"
import { Root, createRoot } from "react-dom/client"
import { JupyterLabEntrypoint } from "./components/JupyterLabEntrypoint"

export class OptunaDashboardWidget extends Widget {
  private _root: Root | null = null

  constructor() {
    super()
    this.addClass("jp-react-widget")
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg)
    if (this._root === null) {
      this._root = createRoot(this.node)
      this._root.render(<JupyterLabEntrypoint />)
    }
  }

  dispose(): void {
    if (this._root !== null) {
      this._root.unmount()
      this._root = null
    }
    super.dispose()
  }
}
