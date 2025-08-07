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
  const [filterQuery, setFilterQuery] = useState("")
  const [filteredTrials, setFilteredTrials] = useState<Trial[] | undefined>(
    undefined
  )
  const [isFiltering, setIsFiltering] = useState(false)
  const llmEnabled = useAtomValue(llmIsAvailable)
  const theme = useTheme()

  const handleFilter = useCallback(async () => {
    if (!filterQuery.trim()) {
      setFilteredTrials(undefined)
      return
    }

    setIsFiltering(true)
    try {
      const result = await trialFilter(studyDetail.trials, filterQuery)

      // Convert back to Optuna.Trial[] for display
      const filteredOptunaTrials = result.map((filteredTrial) => {
        // Find the original trial to preserve all properties
        const originalTrial = studyDetail.trials.find(
          (t) => t.number === filteredTrial.number
        )
        return originalTrial!
      })

      setFilteredTrials(filteredOptunaTrials)
    } catch (error) {
      console.error("Filter failed:", error)
      // Keep previous filtered trials or undefined
    } finally {
      setIsFiltering(false)
    }
  }, [filterQuery, trialFilter, studyDetail.trials])

  const handleClearFilter = useCallback(() => {
    setFilterQuery("")
    setFilteredTrials(undefined)
  }, [])

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
                label="Filter query"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Enter filter conditions..."
                fullWidth
                size="small"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFilter()
                  }
                }}
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
                startIcon={
                  isFiltering ? (
                    <CircularProgress size={16} />
                  ) : (
                    <FilterListIcon />
                  )
                }
                onClick={handleFilter}
                disabled={isFiltering}
                sx={{ minWidth: "120px" }}
              >
                {isFiltering ? "Filtering..." : "Filter"}
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
