import React, { FC, useEffect } from "react"
import { useRecoilValue } from "recoil"
import { Link } from "react-router-dom"
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles"
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
  TextField,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from "@material-ui/core"
import { AddBox, Refresh } from "@material-ui/icons"

import { actionCreator } from "../action"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { studySummariesState } from "../state"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    card: {
      margin: theme.spacing(2),
    },
    grow: {
      flexGrow: 1,
    },
  })
)

export const StudyList: FC<{}> = () => {
  const classes = useStyles()
  const [openDialog, setOpenDialog] = React.useState(false)
  const [newStudyName, setNewStudyName] = React.useState("")
  const [maximize, setMaximize] = React.useState<boolean>(false)

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
        <Link to={`${URL_PREFIX}/studies/${studies[i].study_id}`}>
          {studies[i].study_name}
        </Link>
      ),
    },
    {
      field: "direction",
      label: "Direction",
      sortable: false,
      toCellValue: (i) => studies[i].direction.toString(),
    },
    {
      field: "best_trial",
      label: "Best value",
      sortable: false,
      toCellValue: (i) => studies[i].best_trial?.value || null,
    },
  ]

  const collapseAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]

  const handleCloseNewStudyDialog = () => {
    setNewStudyName("")
    setOpenDialog(false)
  }

  const handleCreateNewStudy = () => {
    const direction = maximize ? "maximize" : "minimize"
    action.createNewStudy(newStudyName, direction)
    setOpenDialog(false)
    setNewStudyName("")
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
        <Container>
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <div className={classes.grow} />
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => {
                action.updateStudySummaries("Success to reload")
              }}
              color="inherit"
            >
              <Refresh />
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => {
                setOpenDialog(true)
              }}
              color="inherit"
            >
              <AddBox />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container>
        <Card className={classes.card}>
          <DataGrid<StudySummary>
            columns={columns}
            rows={studies}
            keyField={"study_id"}
            collapseBody={collapseBody}
            initialRowsPerPage={-1}
            rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
          />
        </Card>
      </Container>
      <Dialog
        open={openDialog}
        onClose={(e) => handleCloseNewStudyDialog}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">New study</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a new study, please enter the study name here.
          </DialogContentText>
          <TextField
            autoFocus
            error={newStudyNameAlreadyUsed}
            helperText={
              newStudyNameAlreadyUsed ? `"${newStudyName}" is already used` : ""
            }
            label="Study name"
            type="text"
            onChange={(e) => {
              setNewStudyName(e.target.value)
            }}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={maximize}
                onChange={(e) => {
                  setMaximize(!maximize)
                }}
                color="primary"
              />
            }
            label="Set maximize direction"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNewStudyDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewStudy}
            color="primary"
            disabled={newStudyName === "" || newStudyNameAlreadyUsed}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
