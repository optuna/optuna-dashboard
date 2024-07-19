import { Card, CardContent } from "@mui/material"
import { PlotIntermediateValues } from "@optuna/react"
import React, { FC } from "react"
import { Trial } from "ts/types/optuna"

export const GraphIntermediateValues: FC<{
  trials: Trial[]
  includePruned: boolean
  logScale: boolean
}> = ({ trials, includePruned, logScale }) => {
  return (
    <Card>
      <CardContent>
        <PlotIntermediateValues
          trials={trials}
          includePruned={includePruned}
          logScale={logScale}
        />
      </CardContent>
    </Card>
  )
}
