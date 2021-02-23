import React, { FC, useEffect, useState } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import { createStyles, fade, makeStyles, Theme } from "@material-ui/core/styles"
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
  Select,
  MenuItem,
} from "@material-ui/core"
import { Home, Cached } from "@material-ui/icons"

import { DataGridColumn, DataGrid } from "./DataGrid"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { GraphSlice } from "./GraphSlice"
import { GraphSlice2} from "./GraphSlice2"
import { GraphHistory } from "./GraphHistory"
import { actionCreator } from "../action"
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
    reload: {
      position: "relative",
      borderRadius: theme.shape.borderRadius,
      backgroundColor: fade(theme.palette.common.white, 0.15),
      "&:hover": {
        backgroundColor: fade(theme.palette.common.white, 0.25),
      },
      marginLeft: 0,
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        marginLeft: theme.spacing(1),
        width: "auto",
      },
    },
    reloadIcon: {
      padding: theme.spacing(0, 2),
      height: "100%",
      position: "absolute",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    reloadSelect: {
      color: "inherit",
      padding: theme.spacing(1, 1, 1, 0),
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
      transition: theme.transitions.create("width"),
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        width: "14ch",
        "&:focus": {
          width: "20ch",
        },
      },
    },
    grow: {
      flexGrow: 1,
    },
  })
)

interface ParamTypes {
  studyId: string
}

const isSingleObjectiveStudy = (studyDetail: StudyDetail): boolean => {
  return studyDetail.directions.length === 1
}

export const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

export const StudyDetail: FC<{}> = () => {
  const classes = useStyles()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetailValue(studyIdNumber)
  const [openReloadIntervalSelect, setOpenReloadIntervalSelect] = useState<
    boolean
  >(false)
  const [reloadInterval, setReloadInterval] = useState<number>(10)

  useEffect(() => {
    action.updateStudyDetail(studyIdNumber)
  }, [])

  useEffect(() => {
    if (reloadInterval < 0) {
      return
    }
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyIdNumber)
    }, reloadInterval * 1000)
    return () => clearInterval(intervalId)
  }, [reloadInterval])

  const title = studyDetail !== null ? studyDetail.name : `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  return (
    <div>
      <AppBar position="static">
        <Container>
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <div className={classes.grow} />
            <div
              className={classes.reload}
              onClick={(e) => {
                setOpenReloadIntervalSelect(!openReloadIntervalSelect)
              }}
            >
              <div className={classes.reloadIcon}>
                <Cached />
              </div>
              <Select
                value={reloadInterval}
                className={classes.reloadSelect}
                open={openReloadIntervalSelect}
                onOpen={() => {
                  setOpenReloadIntervalSelect(true)
                }}
                onClose={() => {
                  setOpenReloadIntervalSelect(false)
                }}
                onChange={(e) => {
                  setReloadInterval(e.target.value as number)
                }}
              >
                <MenuItem value={-1}>stop</MenuItem>
                <MenuItem value={5}>5s</MenuItem>
                <MenuItem value={10}>10s</MenuItem>
                <MenuItem value={30}>30s</MenuItem>
                <MenuItem value={60}>60s</MenuItem>
              </Select>
            </div>
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
          {studyDetail !== null && isSingleObjectiveStudy(studyDetail) ? (
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
          ) : null}
          <Card className={classes.card}>
            <CardContent>
              <GraphSlice trials={trials} />
            </CardContent>
          </Card>
          <Card className={classes.card}>
            <TrialTable studyDetail={studyDetail} />
          </Card>
        </div>
      </Container>
    </div>
  )
}

const TrialTable: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  let columns: DataGridColumn<Trial>[] = [
    { field: "number", label: "Number", sortable: true, padding: "none" },
    {
      field: "state",
      label: "State",
      sortable: true,
      filterable: true,
      padding: "none",
      toCellValue: (i) => trials[i].state.toString(),
    },
  ]
  if (studyDetail === null || isSingleObjectiveStudy(studyDetail)) {
    columns.push({
      field: "values",
      label: "Value",
      sortable: true,
      toCellValue: (i) => trials[i].values?.[0] || null,
    })
  } else {
    const objectiveColumns: DataGridColumn<
      Trial
    >[] = studyDetail.directions.map((s, objectiveId) => ({
      field: "values",
      label: `Objective ${objectiveId}`,
      sortable: true,
      toCellValue: (i) => trials[i].values?.[objectiveId] || null,
    }))
    columns.push(...objectiveColumns)
  }
  columns.push({
    field: "params",
    label: "Params",
    toCellValue: (i) =>
      trials[i].params.map((p) => p.name + ": " + p.value).join(", "),
  })

  const collapseParamColumns: DataGridColumn<TrialParam>[] = [
    { field: "name", label: "Name", sortable: true },
    { field: "value", label: "Value", sortable: true },
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
              Parameters
            </Typography>
            <DataGrid<TrialParam>
              columns={collapseParamColumns}
              rows={trials[index].params}
              keyField={"name"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
            <Typography variant="h6" gutterBottom component="div">
              Trial user attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={trials[index].user_attrs}
              keyField={"key"}
              dense={true}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
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
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
            <Typography variant="h6" gutterBottom component="div">
              Trial system attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={trials[index].system_attrs}
              keyField={"key"}
              dense={true}
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
