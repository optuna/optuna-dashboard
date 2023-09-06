import * as plotly from "plotly.js-dist-min"
import React, { FC, useEffect } from "react"
import { Box } from "@mui/material"

export const UserDefinedPlot: FC<{
  graphObject: PlotlyGraphObject
}> = ({ graphObject }) => {
  const plotDomId = `user-defined-plot:${graphObject.id}`

  useEffect(() => {
    const parsed = JSON.parse(graphObject.graph_object)
    plotly.react(plotDomId, parsed.data, parsed.layout)
  }, [graphObject])

  return <Box id={plotDomId} sx={{ height: "450px" }} />
}
