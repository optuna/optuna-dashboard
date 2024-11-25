import { Box, Card, CardContent, Typography, useTheme } from "@mui/material"
import { PlotTCParallelCoordinate } from "@optuna/react"
import React, { FC } from "react"
import { GraphTCParetoFront } from "./GraphTCParetoFront"

import { StudyDetail } from "ts/types/optuna"

interface SelectedTrial {
  trialIds: number[]
  values: Record<string, number>[]
}

export const TrialCompare: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const [selectedTrials, setSelectedTrials] =
    React.useState<SelectedTrial | null>(null)
  const handleSelectionChange = (newSelection: SelectedTrial) => {
    setSelectedTrials(newSelection)
  }

  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
      <Typography
        variant="h5"
        sx={{
          margin: theme.spacing(2),
          marginTop: theme.spacing(4),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Trial Comparison
      </Typography>
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <PlotTCParallelCoordinate
            study={studyDetail}
            onSelectionChange={handleSelectionChange}
          />
        </CardContent>
      </Card>
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <GraphTCParetoFront
            study={studyDetail}
            selectedTrials={selectedTrials?.trialIds || []}
          />
        </CardContent>
      </Card>
    </Box>
  )
}
