import React, { FC, useMemo, useState, useEffect } from "react"
import { HashRouter as Router, Routes, Route } from "react-router-dom"
import { SnackbarProvider } from "notistack"
import blue from "@mui/material/colors/blue"
import pink from "@mui/material/colors/pink"
import {
  createTheme,
  useMediaQuery,
  ThemeProvider,
  Box,
  CssBaseline,
} from "@mui/material"

import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"

export const App: FC = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")
  const [colorMode, setColorMode] = useState<"light" | "dark">("light")
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
          primary: blue,
          secondary: pink,
        },
      }),
    [colorMode]
  )

  useEffect(() => {
    setColorMode(prefersDarkMode ? "dark" : "light")
  }, [prefersDarkMode])

  const toggleColorMode = () => {
    setColorMode(colorMode === "dark" ? "light" : "dark")
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box>
        <SnackbarProvider maxSnack={3}>
          <Router>
            <Routes>
              <Route
                path=""
                element={<StudyList toggleColorMode={toggleColorMode} />}
              />
              <Route
                path=":idx"
                element={<StudyDetail toggleColorMode={toggleColorMode} />}
              />
            </Routes>
          </Router>
        </SnackbarProvider>
      </Box>
    </ThemeProvider>
  )
}
