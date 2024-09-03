import { useTheme } from "@mui/material"
import { PlotHistory } from "@optuna/react"
import React, { FC } from "react"
import { useNavigate } from "react-router-dom"
import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { usePlotlyColorTheme } from "../state"

export const GraphHistory: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
}> = ({ studies, logScale, includePruned }) => {
  const { url_prefix } = useConstants()
  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const linkURL = (studyId: number, trialNumber: number) => {
    return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
  }
  const navigate = useNavigate()

  return (
    <PlotHistory
      studies={studies}
      logScale={logScale}
      includePruned={includePruned}
      colorTheme={colorTheme}
      linkURL={linkURL}
      router={navigate}
    />
  )
}
