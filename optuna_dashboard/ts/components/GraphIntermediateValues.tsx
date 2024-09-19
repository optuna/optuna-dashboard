import { Card, CardContent, useTheme } from "@mui/material"
import { PlotIntermediateValues } from "@optuna/react"
import React, { FC } from "react"
import { Trial } from "ts/types/optuna"
import { usePlotlyColorTheme } from "../state"

export const GraphIntermediateValues: FC<{
  trials: Trial[]
  includePruned: boolean
  logScale: boolean
}> = ({ trials, includePruned, logScale }) => {
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  return (
    <Card>
      <CardContent>
        <PlotIntermediateValues
          trials={trials}
          includePruned={includePruned}
          logScale={logScale}
          colorTheme={colorTheme}
        />
      </CardContent>
    </Card>
  )
}
