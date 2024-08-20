import { useTheme } from "@mui/material"
import { PlotHistory } from "@optuna/react"
import React, { FC } from "react"
import { StudyDetail } from "ts/types/optuna"
import { usePlotlyColorTheme } from "../state"

export const GraphHistory: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
}> = ({ studies, logScale, includePruned }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  return (
    <PlotHistory
      studies={studies}
      logScale={logScale}
      includePruned={includePruned}
      colorTheme={colorTheme}
    />
  )
}
