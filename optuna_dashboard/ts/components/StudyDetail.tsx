import React, { FC, useEffect, useState } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import {
  AppBar,
  Dialog,
  Checkbox,
  Card,
  Typography,
  CardContent,
  Container,
  Grid,
  Toolbar,
  Box,
  IconButton,
  MenuItem,
  FormGroup,
  useTheme,
  FormLabel,
  TextField,
  alpha,
} from "@mui/material"
import { styled } from "@mui/system"
import { Cached, Home, Settings } from "@mui/icons-material"
import FormControlLabel from "@mui/material/FormControlLabel"
import MuiDialogTitle from "@mui/material/DialogTitle"
import MuiDialogContent from "@mui/material/DialogContent"
import CloseIcon from "@mui/icons-material/Close"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"

import { DataGridColumn, DataGrid } from "./DataGrid"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { GraphHyperparameterImportances } from "./GraphHyperparameterImportances"
import { Edf } from "./GraphEdf"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { GraphSlice } from "./GraphSlice"
import { GraphHistory } from "./GraphHistory"
import { GraphParetoFront } from "./GraphParetoFront"
import { Note } from "./Note"
import { actionCreator } from "../action"
import { studyDetailsState, studySummariesState } from "../state"

interface ParamTypes {
  studyId: string
}

const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

const useStudySummaryValue = (studyId: number): StudySummary | null => {
  const studySummaries = useRecoilValue<StudySummary[]>(studySummariesState)
  return studySummaries.find((s) => s.study_id == studyId) || null
}

interface Preference {
  graphHistoryChecked: boolean
  graphParetoFrontChecked: boolean
  graphParallelCoordinateChecked: boolean
  graphIntermediateValuesChecked: boolean
  graphEdfChecked: boolean
  graphHyperparameterImportancesChecked: boolean
  graphSliceChecked: boolean
  noteEditorChecked: boolean
  reloadInterval: number
}

export const StudyDetail: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetailValue(studyIdNumber)
  const studySummary = useStudySummaryValue(studyIdNumber)
  const directions = studyDetail?.directions || studySummary?.directions || null

  const [preferences, setPreferences] = useState<Preference>({
    graphHistoryChecked: true,
    graphParetoFrontChecked: true,
    graphParallelCoordinateChecked: true,
    graphIntermediateValuesChecked: true,
    graphEdfChecked: true,
    graphHyperparameterImportancesChecked: true,
    graphSliceChecked: true,
    noteEditorChecked: true,
    reloadInterval: 10,
  })
  useEffect(() => {
    const localStoragePreferences = localStorage.getItem("savedPref")
    if (localStoragePreferences !== null) {
      const merged = { ...preferences, ...JSON.parse(localStoragePreferences) }
      setPreferences(merged)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem("savedPref", JSON.stringify(preferences))
  }, [preferences])

  const [prefOpen, setPrefOpen] = useState(false)
  const handleClickOpen = () => {
    setPrefOpen(true)
  }
  const handleClose = () => {
    setPrefOpen(false)
  }
  const handlePreferenceOnChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPreferences({
      ...preferences,
      [event.target.name]: event.target.checked,
    })
  }

  useEffect(() => {
    action.updateStudyDetail(studyIdNumber)
  }, [])

  useEffect(() => {
    if (preferences.reloadInterval < 0) {
      return
    }
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyIdNumber)
    }, preferences.reloadInterval * 1000)
    return () => clearInterval(intervalId)
  }, [preferences.reloadInterval, studyDetail])
  // TODO(chenghuzi): Reduce the number of calls to setInterval and clearInterval.

  const title = studyDetail !== null ? studyDetail.name : `Study #${studyId}`
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  const PreferenceDialog = () => {
    return (
      <Dialog onClose={handleClose} aria-labelledby="vis-pref" open={prefOpen}>
        <MuiDialogTitle
          sx={{
            margin: 0,
            padding: theme.spacing(2),
            minWidth: 300,
          }}
        >
          <Typography variant="h6">Preferences</Typography>
          <IconButton
            aria-label="close"
            sx={{
              position: "absolute",
              right: theme.spacing(1),
              top: theme.spacing(1),
              color: theme.palette.grey[500],
            }}
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </MuiDialogTitle>
        <MuiDialogContent dividers>
          <FormLabel component="legend">Charts</FormLabel>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.graphHistoryChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphHistoryChecked"
                />
              }
              label="History"
            />
            <FormControlLabel
              disabled={directions?.length === 1}
              control={
                <Checkbox
                  checked={preferences.graphParetoFrontChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphParetoFrontChecked"
                />
              }
              label="Pareto Front"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.graphParallelCoordinateChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphParallelCoordinateChecked"
                />
              }
              label="Parallel Coordinate"
            />
            <FormControlLabel
              disabled={
                studyDetail !== null &&
                (studyDetail.directions.length > 1 ||
                  !studyDetail.has_intermediate_values)
              }
              control={
                <Checkbox
                  checked={preferences.graphIntermediateValuesChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphIntermediateValuesChecked"
                />
              }
              label="Intermediate Values"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.graphEdfChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphEdfChecked"
                />
              }
              label="EDF"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.graphHyperparameterImportancesChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphHyperparameterImportancesChecked"
                />
              }
              label="Hyperparameter Importances"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.graphSliceChecked}
                  onChange={handlePreferenceOnChange}
                  name="graphSliceChecked"
                />
              }
              label="Slice"
            />
            <FormLabel component="legend">Editor</FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={preferences.noteEditorChecked}
                  onChange={handlePreferenceOnChange}
                  name="noteEditorChecked"
                />
              }
              label="NoteEditor"
            />
          </FormGroup>
        </MuiDialogContent>
      </Dialog>
    )
  }

  return (
    <div>
      <PreferenceDialog />
      <AppBar position="static">
        <Container
          sx={{
            ["@media (min-width: 1280px)"]: {
              maxWidth: "100%",
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ReloadIntervalSelect
              preferences={preferences}
              setPreferences={setPreferences}
            />
            <IconButton
              onClick={() => {
                toggleColorMode()
              }}
              color="inherit"
              title={
                theme.palette.mode === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme.palette.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
            <IconButton
              color="inherit"
              onClick={handleClickOpen}
              title="Open preference panel"
            >
              <Settings />
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              component={Link}
              to={URL_PREFIX + "/"}
              color="inherit"
              title="Go to the top"
            >
              <Home />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        sx={{
          ["@media (min-width: 1280px)"]: {
            maxWidth: "100%",
          },
        }}
      >
        <div>
          <Typography
            variant="h4"
            sx={{
              margin: `${theme.spacing(4)} ${theme.spacing(2)}`,
              fontWeight: 700,
              fontSize: "1.8rem",
              ...(theme.palette.mode === "dark" && {
                color: theme.palette.primary.light,
              }),
            }}
          >
            {title}
          </Typography>
          {preferences.graphHistoryChecked ? (
            <Card
              sx={{
                margin: theme.spacing(2),
              }}
            >
              <CardContent>
                <GraphHistory study={studyDetail} />
              </CardContent>
            </Card>
          ) : null}

          {directions !== null &&
          directions.length > 1 &&
          preferences.graphParetoFrontChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <GraphParetoFront study={studyDetail} />
              </CardContent>
            </Card>
          ) : null}
          {preferences.graphParallelCoordinateChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <GraphParallelCoordinate study={studyDetail} />
              </CardContent>
            </Card>
          ) : null}

          {studyDetail !== null &&
          studyDetail.directions.length == 1 &&
          studyDetail.has_intermediate_values &&
          preferences.graphIntermediateValuesChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <GraphIntermediateValues trials={trials} />
              </CardContent>
            </Card>
          ) : null}
          {preferences.graphEdfChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <Edf study={studyDetail} />
              </CardContent>
            </Card>
          ) : null}
          {preferences.graphHyperparameterImportancesChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <GraphHyperparameterImportances
                  study={studyDetail}
                  studyId={studyIdNumber}
                />
              </CardContent>
            </Card>
          ) : null}

          {studyDetail !== null && preferences.graphSliceChecked ? (
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <GraphSlice study={studyDetail} />
              </CardContent>
            </Card>
          ) : null}
          <Card sx={{ margin: theme.spacing(2) }}>
            <TrialTable studyDetail={studyDetail} />
          </Card>
          {studyDetail !== null && preferences.noteEditorChecked ? (
            <Note studyId={studyIdNumber} latestNote={studyDetail.note} />
          ) : null}
        </div>
      </Container>
    </div>
  )
}

const ReloadIntervalSelect: FC<{
  preferences: Preference
  setPreferences: (p: Preference) => void
}> = ({ preferences, setPreferences }) => {
  const Wrapper = styled("div")(({ theme }) => ({
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(1),
      width: "auto",
    },
  }))

  const IconWrapper = styled("div")(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }))

  const Select = styled(TextField)(({ theme }) => ({
    color: "inherit",
    width: "14ch",
    "& .MuiInput-underline:after": {
      borderColor: "rgb(256,256,256,.1)",
    },
    "& .MuiOutlinedInput-root": {
      color: "inherit",
      "& fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
      "& .MuiSelect-icon": {
        color: "white",
      },
      "&:hover fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "rgb(256,256,256,.1)",
      },
    },
    "& .MuiInputBase-input": {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
      width: "100%",
    },
  }))

  return (
    <Wrapper>
      <IconWrapper>
        <Cached />
      </IconWrapper>
      <Select
        select
        value={preferences.reloadInterval}
        onChange={(e) => {
          setPreferences({
            ...preferences,
            ["reloadInterval"]: e.target.value as unknown as number,
          })
        }}
      >
        <MenuItem value={-1}>stop</MenuItem>
        <MenuItem value={5}>5s</MenuItem>
        <MenuItem value={10}>10s</MenuItem>
        <MenuItem value={30}>30s</MenuItem>
        <MenuItem value={60}>60s</MenuItem>
      </Select>
    </Wrapper>
  )
}

export const TrialTable: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []

  const columns: DataGridColumn<Trial>[] = [
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
  if (studyDetail === null || studyDetail.directions.length == 1) {
    columns.push({
      field: "values",
      label: "Value",
      sortable: true,
      less: (firstEl, secondEl): number => {
        const firstVal = firstEl.values?.[0]
        const secondVal = secondEl.values?.[0]

        if (firstVal === secondVal) {
          return 0
        }
        if (firstVal === undefined) {
          return -1
        } else if (secondVal === undefined) {
          return 1
        }
        if (firstVal === "-inf" || secondVal === "inf") {
          return 1
        } else if (secondVal === "-inf" || firstVal === "inf") {
          return -1
        }
        return firstVal < secondVal ? 1 : -1
      },
      toCellValue: (i) => {
        if (trials[i].values === undefined) {
          return null
        }
        return trials[i].values?.[0]
      },
    })
  } else {
    const objectiveColumns: DataGridColumn<Trial>[] =
      studyDetail.directions.map((s, objectiveId) => ({
        field: "values",
        label: `Objective ${objectiveId}`,
        sortable: true,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.values?.[objectiveId]
          const secondVal = secondEl.values?.[objectiveId]

          if (firstVal === secondVal) {
            return 0
          }
          if (firstVal === undefined) {
            return -1
          } else if (secondVal === undefined) {
            return 1
          }
          if (firstVal === "-inf" || secondVal === "inf") {
            return 1
          } else if (secondVal === "-inf" || firstVal === "inf") {
            return -1
          }
          return firstVal < secondVal ? 1 : -1
        },
        toCellValue: (i) => {
          if (trials[i].values === undefined) {
            return null
          }
          return trials[i].values?.[objectiveId]
        },
      }))
    columns.push(...objectiveColumns)
  }
  columns.push({
    field: "datetime_start",
    label: "Duration(ms)",
    toCellValue: (i) => {
      const startMs = trials[i].datetime_start?.getTime()
      const completeMs = trials[i].datetime_complete?.getTime()
      if (startMs !== undefined && completeMs !== undefined) {
        return (completeMs - startMs).toString()
      }
      return null
    },
    sortable: true,
    less: (firstEl, secondEl): number => {
      const firstStartMs = firstEl.datetime_start?.getTime()
      const firstCompleteMs = firstEl.datetime_complete?.getTime()
      const firstDurationMs =
        firstStartMs !== undefined && firstCompleteMs !== undefined
          ? firstCompleteMs - firstStartMs
          : undefined
      const secondStartMs = secondEl.datetime_start?.getTime()
      const secondCompleteMs = secondEl.datetime_complete?.getTime()
      const secondDurationMs =
        secondStartMs !== undefined && secondCompleteMs !== undefined
          ? secondCompleteMs - secondStartMs
          : undefined

      if (firstDurationMs === secondDurationMs) {
        return 0
      } else if (
        firstDurationMs !== undefined &&
        secondDurationMs !== undefined
      ) {
        return firstDurationMs < secondDurationMs ? 1 : -1
      } else if (firstDurationMs !== undefined) {
        return -1
      } else {
        return 1
      }
    },
  })
  if (
    studyDetail?.union_search_space.length ===
    studyDetail?.intersection_search_space.length
  ) {
    studyDetail?.intersection_search_space.forEach((s) => {
      const sortable = s.distribution !== "CategoricalDistribution"
      const filterable = s.distribution === "CategoricalDistribution"
      columns.push({
        field: "params",
        label: `Param ${s.name}`,
        toCellValue: (i) =>
          trials[i].params.find((p) => p.name === s.name)?.value || null,
        sortable: sortable,
        filterable: filterable,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.params.find((p) => p.name === s.name)?.value
          const secondVal = secondEl.params.find(
            (p) => p.name === s.name
          )?.value

          if (firstVal === secondVal) {
            return 0
          } else if (firstVal && secondVal) {
            return firstVal < secondVal ? 1 : -1
          } else if (firstVal) {
            return -1
          } else {
            return 1
          }
        },
      })
    })
  } else {
    columns.push({
      field: "params",
      label: "Params",
      toCellValue: (i) =>
        trials[i].params.map((p) => p.name + ": " + p.value).join(", "),
    })
  }

  const collapseParamColumns: DataGridColumn<TrialParam>[] = [
    { field: "name", label: "Name", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
  const collapseIntermediateValueColumns: DataGridColumn<TrialIntermediateValue>[] =
    [
      { field: "step", label: "Step", sortable: true },
      {
        field: "value",
        label: "Value",
        sortable: true,
        less: (firstEl, secondEl): number => {
          const firstVal = firstEl.value
          const secondVal = secondEl.value
          if (firstVal === secondVal) {
            return 0
          }
          if (
            firstVal === "-inf" ||
            secondVal === "nan" ||
            secondVal === "inf"
          ) {
            return 1
          } else if (
            secondVal === "-inf" ||
            firstVal === "nan" ||
            firstVal === "inf"
          ) {
            return -1
          }
          return firstVal < secondVal ? 1 : -1
        },
      },
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
