import React, { FC, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import { Link } from "react-router-dom"
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  Grid,
  Box,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Menu,
  MenuItem,
  FormControl,
  FormLabel,
  Select,
  useTheme,
  InputAdornment,
  SvgIcon,
  CardContent,
} from "@mui/material"
import {
  Add,
  AddBox,
  Delete,
  Refresh,
  Remove,
  Search,
} from "@mui/icons-material"

import { actionCreator } from "../action"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { DebouncedInputTextField } from "./Debounce"
import { studySummariesState } from "../state"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import Brightness4Icon from "@mui/icons-material/Brightness4"

export const StudyList: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()

  const [newStudySelectionAnchorEl, setNewStudySelectionAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const openNewStudySelection = Boolean(newStudySelectionAnchorEl)
  const [
    openNewSingleObjectiveStudyDialog,
    setOpenNewSingleObjectiveStudyDialog,
  ] = React.useState(false)
  const [
    openNewMultiObjectiveStudyDialog,
    setOpenNewMultiObjectiveStudyDialog,
  ] = React.useState(false)
  const [openDeleteStudyDialog, setOpenDeleteStudyDialog] =
    React.useState(false)
  const [deleteStudyID, setDeleteStudyID] = React.useState(-1)
  const [newStudyName, setNewStudyName] = React.useState("")
  const [studyFilterText, setStudyFilterText] = React.useState<string>("")
  const studyFilter = (row: StudySummary) => {
    const keywords = studyFilterText.split(" ")
    return !keywords.every((k) => {
      if (k === "") {
        return true
      }
      return row.study_name.indexOf(k) >= 0
    })
  }

  const [maximize, setMaximize] = React.useState(false)
  const [directions, setDirections] = React.useState<StudyDirection[]>([
    "minimize",
  ])
  const linkColor = useMemo(
    () =>
      theme.palette.mode === "dark"
        ? theme.palette.primary.light
        : theme.palette.primary.dark,
    [theme.palette.mode]
  )

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)

  const newStudyNameAlreadyUsed = studies.some(
    (v) => v.study_name === newStudyName
  )

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const columns: DataGridColumn<StudySummary>[] = [
    {
      field: "study_id",
      label: "Study ID",
      sortable: true,
    },
    {
      field: "study_name",
      label: "Name",
      sortable: true,
      toCellValue: (i) => (
        <Link
          to={`${URL_PREFIX}/studies/${studies[i].study_id}`}
          style={{ color: linkColor }}
        >
          {studies[i].study_name}
        </Link>
      ),
    },
    {
      field: "directions",
      label: "Direction",
      sortable: false,
      toCellValue: (i) => studies[i].directions.join(),
    },
    {
      field: "study_name",
      label: "",
      sortable: false,
      padding: "none",
      toCellValue: (i) => (
        <IconButton
          aria-label="delete study"
          size="small"
          color="inherit"
          onClick={() => {
            setDeleteStudyID(studies[i].study_id)
            setOpenDeleteStudyDialog(true)
          }}
        >
          <Delete />
        </IconButton>
      ),
    },
  ]

  const collapseAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]

  const handleCloseNewSingleObjectiveStudyDialog = () => {
    setNewStudyName("")
    setOpenNewSingleObjectiveStudyDialog(false)
  }

  const handleCreateNewSingleObjectiveStudy = () => {
    const direction = maximize ? "maximize" : "minimize"
    action.createNewStudy(newStudyName, [direction])
    setOpenNewSingleObjectiveStudyDialog(false)
    setNewStudyName("")
  }

  const handleCloseNewMultiObjectiveStudyDialog = () => {
    setOpenNewMultiObjectiveStudyDialog(false)
    setNewStudyName("")
    setDirections(["minimize"])
  }

  const handleCreateNewMultiObjectiveStudy = () => {
    action.createNewStudy(newStudyName, directions)
    setOpenNewMultiObjectiveStudyDialog(false)
    setNewStudyName("")
    setDirections(["minimize"])
  }

  const handleCloseDeleteStudyDialog = () => {
    setOpenDeleteStudyDialog(false)
    setDeleteStudyID(-1)
  }

  const handleDeleteStudy = () => {
    action.deleteStudy(deleteStudyID)
    setOpenDeleteStudyDialog(false)
    setDeleteStudyID(-1)
  }

  const collapseBody = (index: number) => {
    return (
      <Grid container direction="row">
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Study user attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={studies[index].user_attrs}
              keyField={"key"}
              dense={true}
              initialRowsPerPage={5}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Study system attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={studies[index].system_attrs}
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
    <div>
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
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={() => {
                action.updateStudySummaries("Success to reload")
              }}
              color="inherit"
              title="Reload studies"
            >
              <Refresh />
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => {
                setNewStudySelectionAnchorEl(e.currentTarget)
              }}
              color="inherit"
              title="Create new study"
            >
              <AddBox />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={newStudySelectionAnchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={openNewStudySelection}
              onClose={() => {
                setNewStudySelectionAnchorEl(null)
              }}
            >
              <MenuItem
                onClick={() => {
                  setNewStudySelectionAnchorEl(null)
                  setOpenNewSingleObjectiveStudyDialog(true)
                }}
              >
                Single-objective
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setNewStudySelectionAnchorEl(null)
                  setOpenNewMultiObjectiveStudyDialog(true)
                }}
              >
                Multi-objective
              </MenuItem>
            </Menu>
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
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Box sx={{ maxWidth: 500 }}>
              <DebouncedInputTextField
                onChange={(s) => {
                  setStudyFilterText(s)
                }}
                delay={500}
                textFieldProps={{
                  fullWidth: true,
                  id: "search-study",
                  variant: "outlined",
                  placeholder: "Search study",
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SvgIcon fontSize="small" color="action">
                          <Search />
                        </SvgIcon>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <DataGrid<StudySummary>
            columns={columns}
            rows={studies}
            keyField={"study_id"}
            collapseBody={collapseBody}
            initialRowsPerPage={10}
            rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            defaultFilter={studyFilter}
          />
        </Card>
      </Container>
      <Dialog
        open={openNewSingleObjectiveStudyDialog}
        onClose={() => {
          handleCloseNewSingleObjectiveStudyDialog()
        }}
        aria-labelledby="create-single-objective-study-form-dialog-title"
      >
        <DialogTitle id="create-single-objective-study-form-dialog-title">
          New single-objective study
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a new study, please enter the study name here.
          </DialogContentText>
          <DebouncedInputTextField
            onChange={(s) => {
              setNewStudyName(s)
            }}
            delay={500}
            textFieldProps={{
              type: "text",
              autoFocus: true,
              fullWidth: true,
              error: newStudyNameAlreadyUsed,
              helperText: newStudyNameAlreadyUsed
                ? `"${newStudyName}" is already used`
                : "",
              label: "Study name",
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={maximize}
                onChange={() => {
                  setMaximize(!maximize)
                }}
                color="primary"
              />
            }
            label="Set maximize direction (default: minimize)"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseNewSingleObjectiveStudyDialog}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewSingleObjectiveStudy}
            color="primary"
            disabled={newStudyName === "" || newStudyNameAlreadyUsed}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openNewMultiObjectiveStudyDialog}
        onClose={() => {
          handleCloseNewMultiObjectiveStudyDialog()
        }}
        aria-labelledby="create-multi-objective-study-form-dialog-title"
      >
        <DialogTitle id="create-multi-objective-study-form-dialog-title">
          New multi-objective study
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a new study, please enter the study name and directions
            here.
          </DialogContentText>
          <DebouncedInputTextField
            onChange={(s) => {
              setNewStudyName(s)
            }}
            delay={500}
            textFieldProps={{
              autoFocus: true,
              fullWidth: true,
              error: newStudyNameAlreadyUsed,
              helperText: newStudyNameAlreadyUsed
                ? `"${newStudyName}" is already used`
                : "",
              label: "Study name",
              type: "text",
            }}
          />
        </DialogContent>
        {directions.map((d, i) => (
          <DialogContent key={i}>
            <FormControl component="fieldset" fullWidth={true}>
              <FormLabel component="legend">Objective {i}:</FormLabel>
              <Select
                value={directions[i]}
                onChange={(e) => {
                  const newVal: StudyDirection[] = [...directions]
                  newVal[i] = e.target.value as StudyDirection
                  setDirections(newVal)
                }}
              >
                <MenuItem value="minimize">Minimize</MenuItem>
                <MenuItem value="maximize">Maximize</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
        ))}
        <DialogContent>
          <Button
            variant="outlined"
            startIcon={<Add />}
            sx={{ marginRight: theme.spacing(1) }}
            onClick={() => {
              const newVal: StudyDirection[] = [...directions, "minimize"]
              setDirections(newVal)
            }}
          >
            Add
          </Button>
          <Button
            variant="outlined"
            startIcon={<Remove />}
            sx={{ marginRight: theme.spacing(1) }}
            disabled={directions.length <= 1}
            onClick={() => {
              const newVal: StudyDirection[] = [...directions]
              newVal.pop()
              setDirections(newVal)
            }}
          >
            Remove
          </Button>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseNewMultiObjectiveStudyDialog}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewMultiObjectiveStudy}
            color="primary"
            disabled={
              newStudyName === "" ||
              newStudyNameAlreadyUsed ||
              directions.length === 0
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openDeleteStudyDialog}
        onClose={() => {
          handleCloseDeleteStudyDialog()
        }}
        aria-labelledby="delete-study-dialog-title"
      >
        <DialogTitle id="delete-study-dialog-title">Delete study</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete a study (id={deleteStudyID})?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteStudyDialog} color="primary">
            No
          </Button>
          <Button onClick={handleDeleteStudy} color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
