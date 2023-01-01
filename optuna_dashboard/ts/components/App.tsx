import React, { FC, useMemo, useState, useEffect } from "react"
import { RecoilRoot } from "recoil"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
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
import { StudyDetailBeta } from "./StudyDetailBeta"
import { StudyListBeta } from "./StudyListBeta"

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
    <RecoilRoot>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            backgroundColor: colorMode === "dark" ? "#121212" : "#ffffff",
            width: "100%",
            minHeight: "100vh",
            paddingBottom: theme.spacing(2),
          }}
        >
          <SnackbarProvider maxSnack={3}>
            <Router>
              <Switch>
                <Route
                  path={URL_PREFIX + "/studies/:studyId/beta"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"history"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId/analytics"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"analytics"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId/trials/:trialNumber"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"trialList"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId/trials"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"trialList"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId/trialTable"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"trialTable"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId/note"}
                  children={
                    <StudyDetailBeta
                      toggleColorMode={toggleColorMode}
                      page={"note"}
                    />
                  }
                />
                <Route
                  path={URL_PREFIX + "/studies/:studyId"}
                  children={<StudyDetail toggleColorMode={toggleColorMode} />}
                />
                <Route
                  path={URL_PREFIX + "/beta"}
                  children={<StudyListBeta toggleColorMode={toggleColorMode} />}
                />
                <Route
                  path={URL_PREFIX + "/"}
                  children={<StudyList toggleColorMode={toggleColorMode} />}
                />
              </Switch>
            </Router>
          </SnackbarProvider>
        </Box>
      </ThemeProvider>
    </RecoilRoot>
  )
}
