import ClearIcon from "@mui/icons-material/Clear"
import DownloadIcon from "@mui/icons-material/Download"
import FilterListIcon from "@mui/icons-material/FilterList"
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  useTheme,
} from "@mui/material"
import { PlotParallelCoordinate, TrialTable } from "@optuna/react"
import React, { FC, useState, useDeferredValue, useCallback } from "react"
import { Link } from "react-router-dom"
import { useConstants } from "../constantsProvider"
import { studyDetailToStudy } from "../graphUtil"
import { useLLMIsAvailable } from "../hooks/useAPIMeta"
import { useTrialFilterQuery } from "../hooks/useTrialFilterQuery"
import { StudyDetail, Trial } from "../types/optuna"
import { SelectedTrialArtifactCards } from "./Artifact/SelectedTrialArtifactCards"
import { GraphHistory } from "./GraphHistory"
import { GraphParetoFront } from "./GraphParetoFront"

export const TrialSelection: FC<{ studyDetail: StudyDetail }> = ({
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
  const [_filterQuery, setFilterQuery] = useState("")
  const filterQuery = useDeferredValue(_filterQuery)
  const [filteredTrials, setFilteredTrials] = useState<Trial[] | undefined>(
    undefined
  )
  const llmEnabled = useLLMIsAvailable()

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
  const handleClearFilter = useCallback(() => {
    setFilterQuery("")
    setFilteredTrials(undefined)
  }, [])
  const [trialFilter, render, isTrialFilterProcessing] = useTrialFilterQuery({
    nRetry: 5,
    onDenied: handleClearFilter,
    onFailed: (errorMsg: string): void => {
      console.error(errorMsg)
      handleClearFilter()
    },
  })

  const handleFilter = useCallback(async () => {
    if (isTrialFilterProcessing) {
      return
    }

    if (!filterQuery.trim()) {
      setFilteredTrials(undefined)
      return
    }

    try {
      const result = await trialFilter(studyDetail.trials, filterQuery)
      setFilteredTrials(result)
    } catch (error) {
      // eslint-disable-next-line no-empty
      // Error handling is delegated to onDenied/onFailed callbacks to avoid
      // emmiting error logs when user denied the execution.
    }
  }, [filterQuery, trialFilter, studyDetail.trials])

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
          flexDirection: { xs: "column", md: "row" },
          gap: theme.spacing(1),
          padding: theme.spacing(2),
        }}
      >
        {llmEnabled && (
          <Box
            sx={{
              flexGrow: 1,
              minWidth: "480px",
              gap: theme.spacing(1),
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TextField
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Enter filter query (e.g., trial number < 10)"
              fullWidth
              size="small"
              disabled={isTrialFilterProcessing}
              slotProps={{
                input: {
                  endAdornment: filterQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="clear filter"
                        onClick={handleClearFilter}
                        edge="end"
                        size="small"
                        disabled={isTrialFilterProcessing}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={
                isTrialFilterProcessing ? (
                  <CircularProgress size={16} />
                ) : (
                  <FilterListIcon />
                )
              }
              onClick={handleFilter}
              disabled={isTrialFilterProcessing}
              sx={{ minWidth: "120px", flexShrink: 0 }}
            >
              Filter
            </Button>
          </Box>
        )}
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
      </FormControl>
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <PlotParallelCoordinate
            study={{
              ...studyDetail,
              trials: filteredTrials || studyDetail.trials,
            }}
            includeDominatedTrials={includeDominatedTrials}
            includeInfeasibleTrials={includeInfeasibleTrials}
            onSelectionChange={handleSelectionChange}
          />
        </CardContent>
      </Card>
      {studyDetail.directions.length === 1 ? (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphHistory
              studies={[
                {
                  ...studyDetail,
                  trials: filteredTrials || studyDetail.trials,
                },
              ]}
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
              study={{
                ...studyDetail,
                trials: filteredTrials || studyDetail.trials,
              }}
              selectedTrials={selectedTrials}
            />
          </CardContent>
        </Card>
      )}
      {showArtifacts ? (
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <SelectedTrialArtifactCards
              study={studyDetail}
              selectedTrials={selectedTrials}
            />
          </CardContent>
        </Card>
      ) : null}
      {study && (
        <Box component="div" sx={{ display: "flex", flexDirection: "column" }}>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <TrialTable
                study={{
                  ...studyDetail,
                  trials: filteredTrials || studyDetail.trials,
                }}
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
                        studyDetail.id
                      }?trial_ids=${selectedTrials.join()}`
                    : `/csv/${studyDetail.id}`
                }
                sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
              >
                Download CSV File
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}
      {llmEnabled && render()}
    </Box>
  )
}
