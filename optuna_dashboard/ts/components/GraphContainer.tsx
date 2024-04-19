import { Box, Typography, useTheme } from "@mui/material"
import React from "react"
import { GraphComponentState } from "ts/types/optuna"

function GraphContainer({
  plotDomId,
  graphComponentState,
}: {
  plotDomId: string
  graphComponentState: GraphComponentState
}) {
  const theme = useTheme()
  return (
    <Box component="div" id={plotDomId} sx={{ height: "450px" }}>
      {graphComponentState !== "graphDidRender" && (
        <Box
          component="div"
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color={theme.palette.grey[700]}>Loading...</Typography>
        </Box>
      )}
    </Box>
  )
}

export default GraphContainer
