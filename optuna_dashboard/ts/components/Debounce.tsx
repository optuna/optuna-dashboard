import { TextField, TextFieldProps } from "@mui/material"
import React, { FC, useEffect } from "react"

// TODO(c-bata): Remove this and use `useDeferredValue` instead.
export const DebouncedInputTextField: FC<{
  onChange: (s: string, valid: boolean) => void
  delay: number
  textFieldProps: TextFieldProps
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}> = ({ onChange, delay, textFieldProps, onKeyDown }) => {
  const [text, setText] = React.useState<string>("")
  const [valid, setValidity] = React.useState<boolean>(true)
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(text, valid)
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [text, delay])
  return (
    <TextField
      onChange={(e) => {
        setText(e.target.value)
        setValidity(e.target.validity.valid)
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (onKeyDown === undefined) {
          return
        }
        if (e.key === "Enter") {
          onChange(text, valid)
          onKeyDown(e)
        }
      }}
      {...textFieldProps}
    />
  )
}
