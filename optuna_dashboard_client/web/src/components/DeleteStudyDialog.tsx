import React, { ReactNode, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  DialogActions,
} from "@mui/material"
import { actionCreator } from "../action"

export const useDeleteStudyDialog = (): [
  (studyId: number) => void,
  () => ReactNode
] => {
  const action = actionCreator()

  const [openDeleteStudyDialog, setOpenDeleteStudyDialog] = useState(false)
  const [deleteStudyID, setDeleteStudyID] = useState(-1)

  const handleCloseDeleteStudyDialog = () => {
    setOpenDeleteStudyDialog(false)
    setDeleteStudyID(-1)
  }

  const handleDeleteStudy = () => {
    action.deleteStudy(deleteStudyID)
    setOpenDeleteStudyDialog(false)
    setDeleteStudyID(-1)
  }

  const openDialog = (studyId: number) => {
    setDeleteStudyID(studyId)
    setOpenDeleteStudyDialog(true)
  }

  const renderDeleteStudyDialog = () => {
    return (
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
    )
  }
  return [openDialog, renderDeleteStudyDialog]
}
