import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from "@mui/material"
import React, { ReactNode, useState, FC } from "react"
import { Artifact } from "ts/types/optuna"
import { actionCreator } from "../../action"

type Target =
  | {
      type: "study"
      studyId: number
      artifact: Artifact
    }
  | {
      type: "trial"
      studyId: number
      trialId: number
      artifact: Artifact
    }
export const useDeleteArtifactDialog = (): [
  (target: Target) => void,
  () => ReactNode,
] => {
  const action = actionCreator()
  const [openDeleteArtifactDialog, setOpenDeleteArtifactDialog] =
    useState(false)
  const [target, setTarget] = useState<Target | null>(null)

  const handleCloseDeleteArtifactDialog = () => {
    setOpenDeleteArtifactDialog(false)
    setTarget(null)
  }

  const handleDeleteArtifact = () => {
    if (target === null) return
    if (target.type === "study") {
      action.deleteStudyArtifact(target.studyId, target.artifact.artifact_id)
    } else if (target.type === "trial") {
      action.deleteTrialArtifact(
        target.studyId,
        target.trialId,
        target.artifact.artifact_id
      )
    }
    setOpenDeleteArtifactDialog(false)
    setTarget(null)
  }

  const openDialog = (target: Target) => {
    setTarget(target)
    setOpenDeleteArtifactDialog(true)
  }

  const renderDeleteArtifactDialog = () => {
    return (
      <DeleteDialog
        openDeleteArtifactDialog={openDeleteArtifactDialog}
        handleCloseDeleteArtifactDialog={handleCloseDeleteArtifactDialog}
        filename={target?.artifact.filename}
        handleDeleteArtifact={handleDeleteArtifact}
      />
    )
  }
  return [openDialog, renderDeleteArtifactDialog]
}

const DeleteDialog: FC<{
  openDeleteArtifactDialog: boolean
  handleCloseDeleteArtifactDialog: () => void
  filename: string | undefined
  handleDeleteArtifact: () => void
}> = ({
  openDeleteArtifactDialog,
  handleCloseDeleteArtifactDialog,
  filename,
  handleDeleteArtifact,
}) => {
  const theme = useTheme()
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
        <DialogContentText
          sx={{
            marginBottom: theme.spacing(2),
          }}
        >
          Are you sure you want to delete an artifact ("
          {filename}")?
        </DialogContentText>
        <Alert severity="warning">
          If this artifact is linked to another study or trial, it will no
          longer be accessible from that study or trial as well.
        </Alert>
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
