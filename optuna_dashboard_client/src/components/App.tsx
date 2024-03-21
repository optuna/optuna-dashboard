import React, { FC, useMemo, useState, useEffect } from "react"
import { RecoilRoot } from "recoil"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
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

import { CompareStudies } from "./CompareStudies"
import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

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

  return (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            sx={{
              backgroundColor: colorMode === "dark" ? "#121212" : "#ffffff",
              width: "100%",
              minHeight: "100vh",
            }}
          >
            <SnackbarProvider maxSnack={3}>
              <Router>
                <Routes>
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/analytics"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"analytics"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/trials"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"trialList"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/trialTable"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"trialTable"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/note"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"note"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/graph"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"graph"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"top"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/studies/:studyId/preference-history"}
                    element={
                      <StudyDetail
                        toggleColorMode={toggleColorMode}
                        page={"preferenceHistory"}
                      />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/compare-studies"}
                    element={
                      <CompareStudies toggleColorMode={toggleColorMode} />
                    }
                  />
                  <Route
                    path={URL_PREFIX + "/"}
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
