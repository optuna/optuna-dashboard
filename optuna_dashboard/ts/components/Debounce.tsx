import React, { FC, useEffect } from "react"
import { TextField, TextFieldProps } from "@mui/material"

export const DebouncedInputTextField: FC<{
  onChange: (s: string) => void
  delay: number
  textFieldProps: TextFieldProps
}> = ({ onChange, delay, textFieldProps }) => {
  const [text, setText] = React.useState<string>("")
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(text)
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [text, delay])
  return (
    <TextField
      onChange={(e) => {
        setText(e.target.value)
      }}
      {...textFieldProps}
    />
  )
}
