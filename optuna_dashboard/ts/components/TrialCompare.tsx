import DownloadIcon from "@mui/icons-material/Download"
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material"
import { PlotTCParallelCoordinate, TrialTableTC } from "@optuna/react"
import React, { FC } from "react"
import { Link } from "react-router-dom"
import { GraphTCHistory } from "./GraphTCHistory"
import { GraphTCParetoFront } from "./GraphTCParetoFront"

import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { studyDetailToStudy } from "../graphUtil"

interface SelectedTrial {
  trialIds: number[]
  values: Record<string, number>[]
}

export const TrialCompare: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const { url_prefix } = useConstants()
  const [selectedTrials, setSelectedTrials] =
    React.useState<SelectedTrial | null>(null)
  const handleSelectionChange = (newSelection: SelectedTrial) => {
    setSelectedTrials(newSelection)
  }
  const study = studyDetailToStudy(studyDetail)
  const linkURL = (studyId: number, trialNumber: number) => {
    return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
  }

  const width = window.innerWidth - 100

  return (
    <Box
      component="div"
      sx={{ display: "flex", width: width, flexDirection: "column" }}
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
      {studyDetail?.directions.length === 1 ? (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphTCHistory
              studies={studyDetail !== null ? [studyDetail] : []}
              logScale={false}
              includePruned={false}
              selectedTrials={selectedTrials?.trialIds || []}
            />
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphTCParetoFront
              study={studyDetail}
              selectedTrials={selectedTrials?.trialIds || []}
            />
          </CardContent>
        </Card>
      )}
      {study ? (
        <Box component="div" sx={{ display: "flex", flexDirection: "column" }}>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <TrialTableTC
                study={study}
                selectedTrials={selectedTrials?.trialIds || []}
                linkComponent={Link}
                linkURL={linkURL}
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                download
                href={
                  selectedTrials &&
                  selectedTrials.trialIds.length !== study.trials.length
                    ? `/csv/${
                        studyDetail?.id
                      }?trial_ids=${selectedTrials?.trialIds.join()}`
                    : `/csv/${studyDetail?.id}`
                }
                sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
              >
                Download CSV File
              </Button>
            </CardContent>
          </Card>
        </Box>
      ) : null}
    </Box>
  )
}
