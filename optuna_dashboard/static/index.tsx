import React, { FC } from "react"
import { render } from "react-dom"
import { RecoilRoot } from "recoil"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { SnackbarProvider } from "notistack"

import { StudyDetail } from "./components/studyDetail"
import { StudyList } from "./components/studyList"

const DashboardApp: FC<{}> = () => {
  return (
    <RecoilRoot>
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
    </RecoilRoot>
  )
}

render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>,
  document.getElementById("dashboard")
)
