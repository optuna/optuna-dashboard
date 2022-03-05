import React, { FC, useMemo } from "react"
import { RecoilRoot } from "recoil"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { SnackbarProvider } from "notistack"

import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"
import {createTheme, useMediaQuery, ThemeProvider} from "@mui/material"

export const App: FC = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  return (
    <RecoilRoot>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
          <Router>
            <Switch>
              <Route
                  path={URL_PREFIX + "/studies/:studyId"}
                  children={<StudyDetail />}
              />
              <Route path={URL_PREFIX + "/"} children={<StudyList />} />
            </Switch>
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </RecoilRoot>
  )
}
