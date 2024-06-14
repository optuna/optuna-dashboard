import { Box, Typography, useTheme } from "@mui/material"
import { FC } from "react"
import { GraphComponentState } from "../types"

export const GraphContainer: FC<{
  plotDomId: string
  graphComponentState: GraphComponentState
}> = ({ plotDomId, graphComponentState }) => {
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
