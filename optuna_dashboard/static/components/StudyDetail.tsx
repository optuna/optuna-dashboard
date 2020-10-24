import React, { FC, useEffect } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"
import {
  AppBar,
  Card,
  Typography,
  CardContent,
  Container,
  Grid,
  Toolbar,
  Paper,
  Box,
  IconButton,
} from "@material-ui/core"
import { Home } from "@material-ui/icons"

import { DataGridColumn, DataGrid } from "./DataGrid"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { GraphHistory } from "./GraphHistory"
import { Action, actionCreator } from "../action"
import { studyDetailsState } from "../state"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      margin: theme.spacing(2),
      padding: theme.spacing(2),
    },
    card: {
      margin: theme.spacing(2),
    },
    grow: {
      flexGrow: 1,
    },
  })
)

interface ParamTypes {
  studyId: string
}

export const useStudyDetail = (
  action: Action,
  studyId: number
): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)

  useEffect(() => {
    action.updateStudyDetail(studyId)
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyId)
    }, 10 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  return studyDetails[studyId] || null
}

export const StudyDetail: FC<{}> = () => {
  const classes = useStyles()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetail(action, studyIdNumber)

  const title = studyDetail !== null ? studyDetail.name : `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  return (
    <div>
      <AppBar position="static">
        <Container>
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <div className={classes.grow} />
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              component={Link}
              to={URL_PREFIX + "/"}
              color="inherit"
            >
              <Home />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container>
        <div>
          <Paper className={classes.paper}>
            <Typography variant="h6">{title}</Typography>
          </Paper>
          <Card className={classes.card}>
            <CardContent>
              <GraphHistory study={studyDetail} />
            </CardContent>
          </Card>
          <Grid container direction="row">
            <Grid item xs={6}>
              <Card className={classes.card}>
                <CardContent>
                  <GraphParallelCoordinate trials={trials} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card className={classes.card}>
                <CardContent>
                  <GraphIntermediateValues trials={trials} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Card className={classes.card}>
            <TrialTable trials={trials} />
          </Card>
        </div>
      </Container>
    </div>
  )
}

const TrialTable: FC<{ trials: Trial[] }> = ({ trials = [] }) => {
  const columns: DataGridColumn<Trial>[] = [
    { field: "number", label: "Number", sortable: true },
    {
      field: "state",
      label: "State",
      sortable: false,
      toCellValue: (i) => trials[i].state.toString(),
    },
    { field: "value", label: "Value", sortable: true },
    {
      field: "params",
      label: "Params",
      sortable: false,
      toCellValue: (i) =>
        trials[i].params.map((p) => p.name + ": " + p.value).join(", "),
    },
  ]
  const collapseIntermediateValueColumns: DataGridColumn<
    TrialIntermediateValue
  >[] = [
    { field: "step", label: "Step", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
  const collapseAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]

  const collapseBody = (index: number) => {
    return (
      <Grid container direction="row">
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Intermediate values
            </Typography>
            <DataGrid<TrialIntermediateValue>
              columns={collapseIntermediateValueColumns}
              rows={trials[index].intermediate_values}
              keyField={"step"}
              dense={true}
              initialRowsPerPage={5}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Trial user attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={trials[index].user_attrs}
              keyField={"key"}
              dense={true}
              initialRowsPerPage={5}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
      </Grid>
    )
  }

  return (
    <DataGrid<Trial>
      columns={columns}
      rows={trials}
      keyField={"trial_id"}
      dense={true}
      collapseBody={collapseBody}
    />
  )
}
