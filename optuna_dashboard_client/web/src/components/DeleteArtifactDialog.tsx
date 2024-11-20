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

export const useDeleteArtifactDialog = (): [
  (studyId: number, trialId: number, artifact: Artifact) => void,
  () => ReactNode
] => {
  const action = actionCreator()

  const [openDeleteArtifactDialog, setOpenDeleteArtifactDialog] =
    useState(false)
  const [target, setTarget] = useState<[number, number, Artifact | null]>([
    -1,
    -1,
    null,
  ])

  const handleCloseDeleteArtifactDialog = () => {
    setOpenDeleteArtifactDialog(false)
    setTarget([-1, -1, null])
  }

  const handleDeleteArtifact = () => {
    const [studyId, trialId, artifact] = target
    if (artifact === null) {
      return
    }
    action.deleteArtifact(studyId, trialId, artifact.artifact_id)
    setOpenDeleteArtifactDialog(false)
    setTarget([-1, -1, null])
  }

  const openDialog = (studyId: number, trialId: number, artifact: Artifact) => {
    setTarget([studyId, trialId, artifact])
    setOpenDeleteArtifactDialog(true)
  }

  const renderDeleteArtifactDialog = () => {
    return (
      <Dialog
        open={openDeleteArtifactDialog}
        onClose={() => {
          handleCloseDeleteArtifactDialog()
        }}
        aria-labelledby="delete-artifact-dialog-title"
      >
        <DialogTitle id="delete-artifact-dialog-title">
          Delete artifact
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete an artifact ("
            {target[2]?.filename}")?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteArtifactDialog} color="primary">
            No
          </Button>
          <Button onClick={handleDeleteArtifact} color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  return [openDialog, renderDeleteArtifactDialog]
}
