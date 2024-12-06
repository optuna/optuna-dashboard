import { useTheme } from "@mui/material"
import { PlotTCHistory } from "@optuna/react"
import React, { FC } from "react"
import { useNavigate } from "react-router-dom"
import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { usePlotlyColorTheme } from "../state"

export const GraphTCHistory: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
  selectedTrials: number[]
}> = ({ studies, logScale, includePruned, selectedTrials }) => {
  const { url_prefix } = useConstants()
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const linkURL = (studyId: number, trialNumber: number) => {
    return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
  }
  const navigate = useNavigate()

  return (
    <PlotTCHistory
      studies={studies}
      logScale={logScale}
      includePruned={includePruned}
      colorTheme={colorTheme}
      linkURL={linkURL}
      router={navigate}
      selectedTrials={selectedTrials}
    />
  )
}
