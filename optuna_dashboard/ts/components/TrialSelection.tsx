import DownloadIcon from "@mui/icons-material/Download"
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import { PlotParallelCoordinate, TrialTable } from "@optuna/react"
import React, { FC, useState } from "react"
import { Link } from "react-router-dom"
import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { studyDetailToStudy } from "../graphUtil"
import { SelectedTrialArtifactCards } from "./Artifact/SelectedTrialArtifactCards"
import { GraphHistory } from "./GraphHistory"
import { GraphParetoFront } from "./GraphParetoFront"

export const TrialSelection: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const { url_prefix } = useConstants()
  const [selectedTrials, setSelectedTrials] = useState<number[]>([])
  const [includeInfeasibleTrials, setIncludeInfeasibleTrials] =
    useState<boolean>(true)
  const [includeDominatedTrials, setIncludeDominatedTrials] =
    useState<boolean>(true)
  const [showArtifacts, setShowArtifacts] = useState<boolean>(false)

  const handleSelectionChange = (selectedTrials: number[]) => {
    setSelectedTrials(selectedTrials)
  }
  const handleIncludeInfeasibleTrialsChange = () => {
    setIncludeInfeasibleTrials(!includeInfeasibleTrials)
  }
  const handleShowArtifactsChange = () => {
    setShowArtifacts(!showArtifacts)
  }
  const handleIncludeDominatedTrialsChange = () => {
    if (includeDominatedTrials) {
      setIncludeInfeasibleTrials(false)
    }
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
      <Typography
        variant="h5"
        sx={{
          margin: theme.spacing(2),
          marginTop: theme.spacing(4),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Trial Selection
      </Typography>
      <Card sx={{ margin: theme.spacing(2) }}>
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
                  checked={includeInfeasibleTrials}
                  onChange={handleIncludeInfeasibleTrialsChange}
                  value="enable"
                />
              }
              label="Include Infeasible trials"
            />
          ) : null}
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
          {studyDetail ? (
            <FormControlLabel
              control={
                <Switch
                  checked={showArtifacts}
                  onChange={handleShowArtifactsChange}
                  disabled={studyDetail.trials[0].artifacts.length === 0}
                  value="enable"
                />
              }
              label="Show Artifacts"
            />
          ) : null}
        </FormControl>
        <CardContent>
          <PlotParallelCoordinate
            study={studyDetail}
            includeDominatedTrials={includeDominatedTrials}
            includeInfeasibleTrials={includeInfeasibleTrials}
            onSelectionChange={handleSelectionChange}
          />
        </CardContent>
      </Card>
      {studyDetail?.directions.length === 1 ? (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphHistory
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
            <GraphParetoFront
              study={studyDetail}
              selectedTrials={selectedTrials}
            />
          </CardContent>
        </Card>
      )}
      {studyDetail != null && showArtifacts ? (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <SelectedTrialArtifactCards
              study={studyDetail}
              selectedTrials={selectedTrials}
            />
          </CardContent>
        </Card>
      ) : null}
      {study ? (
        <Box component="div" sx={{ display: "flex", flexDirection: "column" }}>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <TrialTable
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
