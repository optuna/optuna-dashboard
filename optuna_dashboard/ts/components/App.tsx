import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material"
import blue from "@mui/material/colors/blue"
import pink from "@mui/material/colors/pink"
import { SnackbarProvider } from "notistack"
import React, { useMemo, useState, useEffect, FC } from "react"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConstants } from "../constantsProvider"
import { CompareStudies } from "./CompareStudies"
import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
})

export const App: FC = () => {
  const { color_mode, url_prefix } = useConstants()

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")
  const [optunaDashboardColorMode, optunaDashboardSetColorMode] = useState<
    "light" | "dark"
  >("light")
  useEffect(() => {
    optunaDashboardSetColorMode(prefersDarkMode ? "dark" : "light")
  }, [prefersDarkMode])
  const theme = useMemo(() => {
    if (color_mode !== undefined) {
      return createTheme({
        palette: {
          mode: color_mode,
          primary: blue,
          secondary: pink,
        },
      })
    }
    return createTheme({
      palette: {
        mode: optunaDashboardColorMode,
        primary: blue,
        secondary: pink,
      },
    })
  }, [optunaDashboardColorMode, color_mode])
  const toggleColorMode = () => {
    optunaDashboardSetColorMode(
      optunaDashboardColorMode === "dark" ? "light" : "dark"
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          component="div"
          sx={{
            backgroundColor:
              theme.palette.mode === "dark" ? "#121212" : "#ffffff",
            width: "100%",
            minHeight: "100vh",
          }}
        >
          <SnackbarProvider maxSnack={3}>
            <Router>
              <Routes>
                <Route
                  path={url_prefix + "/studies/:studyId/analytics"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"analytics"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/trials"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialList"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/trialTable"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialTable"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/trialSelection"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialSelection"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/note"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"note"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/graph"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"graph"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"top"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/preference-history"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"preferenceHistory"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/compare-studies"}
                  element={<CompareStudies toggleColorMode={toggleColorMode} />}
                />
                <Route
                  path={url_prefix + "/"}
                  element={<StudyList toggleColorMode={toggleColorMode} />}
                />
              </Routes>
            </Router>
          </SnackbarProvider>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
