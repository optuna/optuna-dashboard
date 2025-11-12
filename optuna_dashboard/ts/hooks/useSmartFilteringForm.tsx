import FilterListIcon from "@mui/icons-material/FilterList"
import { Button, CircularProgress } from "@mui/material"
import React, { ReactNode, useState } from "react"
import { SmartTextField } from "../components/SmartTextField"
import { Trial } from "../types/optuna"
import { useTrialFilterQuery } from "./useTrialFilterQuery"

export const useSmartFilteringForm = (
  handleFilter: (
    trialFilterQuery: string,
    trialFilter: (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>
  ) => void
): [() => ReactNode] => {
  const [value, setValue] = useState("")
  const handleClearFilter = () => {
    setValue("")
  }
  const [trialFilter, renderIframe, isProcessing] = useTrialFilterQuery({
    nRetry: 5,
    onDenied: handleClearFilter,
    onFailed: (errorMsg: string) => {
      console.error("Failed to filter trials:", errorMsg)
      handleClearFilter()
    },
  })
  const handleSubmit = () => {
    if (isProcessing) {
      return
    }
    handleFilter(value, trialFilter)
  }

  const render = () => {
    return (
      <>
        <SmartTextField
          handleSubmit={handleSubmit}
          value={value}
          setValue={setValue}
          clearButtonDisabled={isProcessing}
          placeholder="Enter filter query (e.g., trial number < 10)"
          fullWidth={true}
          size="small"
          disabled={isProcessing}
        />
        <Button
          variant="contained"
          startIcon={
            isProcessing ? <CircularProgress size={16} /> : <FilterListIcon />
          }
          onClick={() => {
            if (isProcessing) {
              return
            }
            handleSubmit()
          }}
          disabled={isProcessing}
          sx={{ minWidth: "120px", flexShrink: 0 }}
        >
          Filter
        </Button>
        {renderIframe()}
      </>
    )
  }
  return [render]
}
