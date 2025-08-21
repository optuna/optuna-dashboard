import ClearIcon from "@mui/icons-material/Clear"
import DownloadIcon from "@mui/icons-material/Download"
import FilterListIcon from "@mui/icons-material/FilterList"
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  useTheme,
} from "@mui/material"
import { TrialTable as TsLibTrialTable } from "@optuna/react"
import { useAtomValue } from "jotai"
import React, { FC, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { useConstants } from "../constantsProvider"
import { useTrialFilterQuery } from "../hooks/useTrialFilterQuery"
import { llmIsAvailable } from "../state"
import { StudyDetail, Trial } from "../types/optuna"

export const TrialTable: FC<{ studyDetail: StudyDetail }> = ({
  studyDetail,
}) => {
  const { url_prefix } = useConstants()
  const [trialFilter, render] = useTrialFilterQuery(5)
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

  const handleFilter = useCallback(async () => {
    if (!filterQuery.trim()) {
      setFilteredTrials(undefined)
      return
    }

    try {
      const result = await trialFilter(studyDetail.trials, filterQuery)
      setFilteredTrials(result)
    } catch (error) {
      console.error("Filter failed:", error)
      handleClearFilter()
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
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Enter filter query (e.g., param_name > 0)"
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    endAdornment: filterQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear filter"
                          onClick={handleClearFilter}
                          edge="end"
                          size="small"
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleFilter}
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
