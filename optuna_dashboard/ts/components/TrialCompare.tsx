import DownloadIcon from "@mui/icons-material/Download"
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  useTheme,
} from "@mui/material"
import { PlotTCParallelCoordinate, TrialTableTC } from "@optuna/react"
import React, { FC, useState } from "react"
import { Link } from "react-router-dom"
import { GraphTCHistory } from "./GraphTCHistory"
import { GraphTCParetoFront } from "./GraphTCParetoFront"

import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { studyDetailToStudy } from "../graphUtil"

export const TrialCompare: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const { url_prefix } = useConstants()
  const [selectedTrials, setSelectedTrials] = useState<number[]>([])
  const [includeDominatedTrials, setIncludeDominatedTrials] =
    useState<boolean>(true)

  const handleSelectionChange = (selectedTrials: number[]) => {
    setSelectedTrials(selectedTrials)
  }
  const handleIncludeDominatedTrialsChange = () => {
    setIncludeDominatedTrials(!includeDominatedTrials)
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
      <FormControl
        component="fieldset"
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: theme.spacing(2),
        }}
      >
        {studyDetail ? (
          <FormControlLabel
            control={
              <Switch
                checked={includeDominatedTrials}
                onChange={handleIncludeDominatedTrialsChange}
                disabled={!(studyDetail.directions.length > 1)}
                value="enable"
              />
            }
            label="Include dominated trials"
          />
        ) : null}
      </FormControl>
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <PlotTCParallelCoordinate
            study={studyDetail}
            includeDominatedTrials={includeDominatedTrials}
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
              selectedTrials={selectedTrials}
            />
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphTCParetoFront
              study={studyDetail}
              selectedTrials={selectedTrials}
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
                selectedTrials={selectedTrials}
                linkComponent={Link}
                linkURL={linkURL}
              />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                download
                href={
                  selectedTrials.length !== study.trials.length
                    ? `/csv/${
                        studyDetail?.id
                      }?trial_ids=${selectedTrials.join()}`
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
