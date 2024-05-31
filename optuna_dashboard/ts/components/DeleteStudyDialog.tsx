import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
} from "@mui/material"
import React, { ReactNode, useState } from "react"
import { actionCreator } from "../action"

export const useDeleteStudyDialog = (): [
  (studyId: number) => void,
  () => ReactNode,
] => {
  const action = actionCreator()

  const [openDeleteStudyDialog, setOpenDeleteStudyDialog] = useState(false)
  const [deleteStudyID, setDeleteStudyID] = useState(-1)
  const [removeAssociatedArtifacts, setRemoveAssociatedArtifacts] =
    useState(false)

  const handleCloseDeleteStudyDialog = () => {
    setOpenDeleteStudyDialog(false)
    setDeleteStudyID(-1)
    setRemoveAssociatedArtifacts(false)
  }

  const handleDeleteStudy = () => {
    action.deleteStudy(deleteStudyID, removeAssociatedArtifacts)
    handleCloseDeleteStudyDialog()
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
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="delete-study-dialog-title">Delete study</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete a study (id={deleteStudyID})?
          </DialogContentText>
          <FormControlLabel
            label="Remove associated trial/study artifacts."
            control={
              <Checkbox
                checked={removeAssociatedArtifacts}
                onChange={() => setRemoveAssociatedArtifacts((cur) => !cur)}
              />
            }
          />
          {removeAssociatedArtifacts && (
            <Alert severity="warning">
              If artifacts are linked to another study or trial, they will no
              longer be accessible from that study or trial as well.
            </Alert>
          )}
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
