import FilterListIcon from "@mui/icons-material/FilterList"
import { Button, CircularProgress } from "@mui/material"
import React, { FC, useState } from "react"
import { DebouncedInputTextField } from "../Debounce"

export const SmartFilteringForm: FC<{
  onQueryChange: (query: string) => void
  onSubmit: () => void
  isProcessing: boolean
}> = ({ onQueryChange, onSubmit, isProcessing }) => {
  const [isComposing, setIsComposing] = useState(false)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <>
      <DebouncedInputTextField
        onChange={(val) => onQueryChange(val)}
        delay={500}
        textFieldProps={{
          placeholder: "Enter filter query (e.g., trial number < 10)",
          fullWidth: true,
          size: "small",
          disabled: isProcessing,
          type: "search",
          onKeyDown: handleKeyDown,
          onCompositionStart: () => {
            setIsComposing(true)
          },
          onCompositionEnd: () => {
            setIsComposing(false)
          },
        }}
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
          onSubmit()
        }}
        disabled={isProcessing}
        sx={{ minWidth: "120px", flexShrink: 0 }}
      >
        Filter
      </Button>
    </>
  )
}
