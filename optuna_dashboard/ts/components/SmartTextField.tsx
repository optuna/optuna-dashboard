import ClearIcon from "@mui/icons-material/Clear"
import {
  IconButton,
  InputAdornment,
  TextField,
  TextFieldProps,
} from "@mui/material"
import React, { FC, useState } from "react"

export const SmartTextField: FC<
  {
    handleSubmit: () => void
    value: string
    setValue: React.Dispatch<React.SetStateAction<string>>
    clearButtonDisabled?: boolean
  } & Omit<
    TextFieldProps,
    "onCompositionStart" | "onCompositionEnd" | "value" | "onChange"
  >
> = ({ handleSubmit, value, setValue, clearButtonDisabled, ...props }) => {
  const [isComposing, setIsComposing] = useState(false)

  return (
    <TextField
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !isComposing) {
          e.preventDefault()
          handleSubmit()
        }
      }}
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
      }}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      slotProps={{
        input: {
          endAdornment: value && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear filter"
                onClick={() => {
                  setValue("")
                }}
                edge="end"
                size="small"
                disabled={clearButtonDisabled}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      {...props}
    />
  )
}
