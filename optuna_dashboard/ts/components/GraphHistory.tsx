import ClearIcon from "@mui/icons-material/Clear"
import FilterListIcon from "@mui/icons-material/FilterList"
import { useTheme } from "@mui/material"
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material"
import { PlotHistory } from "@optuna/react"
import { useAtomValue } from "jotai"
import React, { FC, useState, useCallback, useDeferredValue } from "react"
import { useNavigate } from "react-router-dom"
import { StudyDetail } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"
import { useTrialFilterQuery } from "../hooks/useTrialFilterQuery"
import { llmIsAvailable } from "../state"
import { usePlotlyColorTheme } from "../state"

export const GraphHistory: FC<{
  studies: StudyDetail[]
  logScale: boolean
  includePruned: boolean
  selectedTrials?: number[]
}> = ({ studies, logScale, includePruned, selectedTrials }) => {
  const { url_prefix } = useConstants()
  const [trialFilter, render] = useTrialFilterQuery({ nRetry: 5 })
  const [_filterQuery, setFilterQuery] = useState("")
  const filterQuery = useDeferredValue(_filterQuery)
  const [filteredStudies, setFilteredStudies] = useState<
    StudyDetail[] | undefined
  >(undefined)
  const llmEnabled = useAtomValue(llmIsAvailable)

  const handleClearFilter = useCallback(() => {
    setFilterQuery("")
    setFilteredStudies(undefined)
  }, [])

  const handleFilter = useCallback(async () => {
    if (!filterQuery.trim()) {
      setFilteredStudies(undefined)
      return
    }
    try {
      const filteredStudiesPromises = studies.map(async (study) => {
        const filteredTrials = await trialFilter(study.trials, filterQuery)
        return {
          ...study,
          trials: filteredTrials,
        } as StudyDetail
      })

      const result = await Promise.all(filteredStudiesPromises)
      setFilteredStudies(result)
    } catch (error) {
      console.error("Filter failed:", error)
      handleClearFilter()
    }
  }, [filterQuery, trialFilter, studies, handleClearFilter])

  const theme = useTheme()
  const colorTheme = usePlotlyColorTheme(theme.palette.mode)
  const linkURL = (studyId: number, trialNumber: number) => {
    return url_prefix + `/studies/${studyId}/trials?numbers=${trialNumber}`
  }
  const navigate = useNavigate()

  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <PlotHistory
            studies={filteredStudies || studies}
            logScale={logScale}
            includePruned={includePruned}
            colorTheme={colorTheme}
            linkURL={linkURL}
            router={navigate}
            selectedTrials={selectedTrials}
          />
          {llmEnabled && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
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
        </CardContent>
      </Card>
      {llmEnabled && render()}
    </Box>
  )
}
