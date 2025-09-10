import ClearIcon from "@mui/icons-material/Clear"
import DownloadIcon from "@mui/icons-material/Download"
import FilterListIcon from "@mui/icons-material/FilterList"
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  useTheme,
} from "@mui/material"
import { TrialTable as TsLibTrialTable } from "@optuna/react"
import { useAtomValue } from "jotai"
import React, { FC, useState, useCallback, useDeferredValue } from "react"
import { Link } from "react-router-dom"
import { useConstants } from "../constantsProvider"
import { useTrialFilterQuery } from "../hooks/useTrialFilterQuery"
import { llmIsAvailable } from "../state"
import { StudyDetail, Trial } from "../types/optuna"

export const TrialTable: FC<{ studyDetail: StudyDetail }> = ({
  studyDetail,
}) => {
  const { url_prefix } = useConstants()
  const [_filterQuery, setFilterQuery] = useState("")
  const filterQuery = useDeferredValue(_filterQuery)
  const [filteredTrials, setFilteredTrials] = useState<Trial[] | undefined>(
    undefined
  )
  const llmEnabled = useAtomValue(llmIsAvailable)
  const theme = useTheme()

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
  const linkURL = (studyId: number, trialNumber: number) => {
    return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
  }
  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          {llmEnabled && (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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
                sx={{ minWidth: "120px" }}
              >
                Filter
              </Button>
            </Stack>
          )}
          <TsLibTrialTable
            study={{
              ...studyDetail,
              trials: filteredTrials || studyDetail.trials,
            }}
            linkComponent={Link}
            linkURL={linkURL}
          />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            download
            href={`/csv/${studyDetail?.id}`}
            sx={{ marginRight: theme.spacing(2), minWidth: "120px", mt: 2 }}
          >
            Download CSV File
          </Button>
        </CardContent>
      </Card>
      {llmEnabled && render()}
    </Box>
  )
}
