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
import { RecoilRoot } from "recoil"

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
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")
  const [colorMode, setColorMode] = useState<"light" | "dark">("light")
  useEffect(() => {
    setColorMode(prefersDarkMode ? "dark" : "light")
  }, [prefersDarkMode])
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
  const toggleColorMode = () => {
    setColorMode(colorMode === "dark" ? "light" : "dark")
  }

  const { url_prefix } = useConstants()

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            component="div"
            sx={{
              backgroundColor: colorMode === "dark" ? "#121212" : "#ffffff",
              width: "100%",
              minHeight: "100vh",
            }}
          >
            <SnackbarProvider maxSnack={3}>
              <Router basename={url_prefix}>
                <Routes>
                  <Route
                    path="/studies/:studyId/analytics"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"analytics"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/trials"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"trialList"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/trialTable"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"trialTable"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/trialSelection"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"trialSelection"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/note"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"note"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/graph"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"graph"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"top"}
                      />
                    }
                  />
                  <Route
                    path="/studies/:studyId/preference-history"
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"preferenceHistory"}
                      />
                    }
                  />
                  <Route
                    path="/compare-studies"
                    element={
                      <CompareStudies toggleColorMode={toggleColorMode} />
                    }
                  />
                  <Route
                    path="/"
                    element={<StudyList toggleColorMode={toggleColorMode} />}
                  />
                </Routes>
              </Router>
            </SnackbarProvider>
          </Box>
        </ThemeProvider>
      </RecoilRoot>
    </QueryClientProvider>
  )
}
