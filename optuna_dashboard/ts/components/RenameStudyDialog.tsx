import React, { ReactNode, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  DialogActions,
  useTheme,
} from "@mui/material"
import { actionCreator } from "../action"
import { DebouncedInputTextField } from "./Debounce"
import { StudySummary } from "ts/types"

export const useRenameStudyDialog = (
  studies: StudySummary[]
): [(studyId: number, studyName: string) => void, () => ReactNode] => {
  const action = actionCreator()
  const theme = useTheme()

  const [openRenameStudyDialog, setOpenRenameStudyDialog] = useState(false)
  const [renameStudyID, setRenameStudyID] = useState(-1)
  const [prevStudyName, setPrevStudyName] = useState("")
  const [newStudyName, setNewStudyName] = useState("")

  const newStudyNameAlreadyUsed = studies.some(
    (v) => v.study_name === newStudyName
  )

  const handleCloseRenameStudyDialog = () => {
    setOpenRenameStudyDialog(false)
    setRenameStudyID(-1)
    setPrevStudyName("")
  }

  const handleRenameStudy = () => {
    action.renameStudy(renameStudyID, newStudyName)
    setOpenRenameStudyDialog(false)
    setRenameStudyID(-1)
    setPrevStudyName("")
  }

  const openDialog = (studyId: number, prevStudyName: string) => {
    setRenameStudyID(studyId)
    setPrevStudyName(prevStudyName)
    setOpenRenameStudyDialog(true)
  }

  const renderRenameStudyDialog = () => {
    return (
      <Dialog
        open={openRenameStudyDialog}
        onClose={() => {
          handleCloseRenameStudyDialog()
        }}
        aria-labelledby="rename-study-dialog-title"
      >
        <DialogTitle id="rename-study-dialog-title">
          Rename "{prevStudyName}"
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            sx={{
              fontWeight: theme.typography.fontWeightBold,
              marginBottom: theme.spacing(1),
            }}
          >
            Please note that the study_id will be changed because this function
            internally creates a new study and copies all trials to it.
          </DialogContentText>
          <DialogContentText>
            Please enter the new study name.
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
        <DialogActions>
          <Button onClick={handleCloseRenameStudyDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleRenameStudy} color="primary">
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  return [openDialog, renderRenameStudyDialog]
}
