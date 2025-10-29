import FilterListIcon from "@mui/icons-material/FilterList"
import { Button, CircularProgress, TextField } from "@mui/material"
import React, { ReactNode, useState, useRef } from "react"
import { Trial } from "../types/optuna"
import { useTrialFilterQuery } from "./useTrialFilterQuery"

export const useSmartFilteringForm = (
  handleFilter: (
    trialFilterQuery: string,
    trialFilter: (trials: Trial[], filterQueryStr: string) => Promise<Trial[]>
  ) => void
): [() => ReactNode] => {
  const [isComposing, setIsComposing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const handleClearFilter = () => {
    if (inputRef.current) {
      inputRef.current.value = ""
    }
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
    handleFilter(inputRef.current?.value ?? "", trialFilter)
  }

  const render = () => {
    return (
      <>
        <TextField
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !isComposing) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder="Enter filter query (e.g., trial number < 10)"
          fullWidth={true}
          size="small"
          disabled={isProcessing}
          type="search"
          onCompositionStart={() => {
            setIsComposing(true)
          }}
          onCompositionEnd={() => {
            setIsComposing(false)
          }}
          inputRef={inputRef}
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
