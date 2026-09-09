import { Card, CardContent, useTheme } from "@mui/material"
import { FC } from "react"

import { PlotImportance } from "@optuna/react"
import { StudyDetail } from "ts/types/optuna"
import { useParamImportance } from "../hooks/useParamImportance"
import { usePlotlyColorTheme } from "../state"

export const GraphHyperparameterImportance: FC<{
  studyId: number
  study: StudyDetail | null
  graphHeight: string
}> = ({ studyId, study = null, graphHeight }) => {
  const numCompletedTrials =
    study?.trials.filter((t) => t.state === "Complete").length || 0
  const { importances } = useParamImportance({
    numCompletedTrials,
    studyId,
  })

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)

  return (
    <Card>
      <CardContent>
        <PlotImportance
          study={study}
          importance={importances}
          graphHeight={graphHeight}
          colorTheme={colorTheme}
        />
      </CardContent>
    </Card>
  )
}
