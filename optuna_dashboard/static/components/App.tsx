import React, { FC } from "react"
import { RecoilRoot } from "recoil"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { SnackbarProvider } from "notistack"

import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"

export const App: FC<{}> = () => {
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
