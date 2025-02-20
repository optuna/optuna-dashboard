import React, { ReactNode, useState } from "react"
import {
  Dialog,
  useTheme,
  FormLabel,
  DialogTitle,
  DialogContent,
  DialogContentText,
  FormControl,
  Button,
  DialogActions,
  MenuItem,
  Select,
} from "@mui/material"
import { actionCreator } from "../action"
import { DebouncedInputTextField } from "./Debounce"
import { useRecoilValue } from "recoil"
import { studySummariesState } from "../state"
import RemoveIcon from "@mui/icons-material/Remove"
import AddIcon from "@mui/icons-material/Add"

export const useCreateStudyDialog = (): [() => void, () => ReactNode] => {
  const theme = useTheme()
  const action = actionCreator()

  const [newStudyName, setNewStudyName] = useState("")
  const [openNewStudyDialog, setOpenNewStudyDialog] = useState(false)
  const [directions, setDirections] = useState<StudyDirection[]>(["minimize"])
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const newStudyNameAlreadyUsed = studies.some(
    (v) => v.study_name === newStudyName
  )

  const handleCloseNewStudyDialog = () => {
    setOpenNewStudyDialog(false)
    setNewStudyName("")
    setDirections(["minimize"])
  }

  const handleCreateNewStudy = () => {
    action.createNewStudy(newStudyName, directions)
    setOpenNewStudyDialog(false)
    setNewStudyName("")
    setDirections(["minimize"])
  }

  const openDialog = () => {
    setOpenNewStudyDialog(true)
  }

  const renderCreateNewStudyDialog = () => {
    return (
      <Dialog
        open={openNewStudyDialog}
        onClose={() => {
          handleCloseNewStudyDialog()
        }}
        aria-labelledby="create-study-dialog-title"
      >
        <DialogTitle id="create-study-dialog-title">New Study</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please enter the study name and directions here.
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
            startIcon={<AddIcon />}
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
            startIcon={<RemoveIcon />}
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
          <Button onClick={handleCloseNewStudyDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleCreateNewStudy}
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
    )
  }
  return [openDialog, renderCreateNewStudyDialog]
}
