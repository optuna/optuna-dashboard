import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material"
import React, { ReactNode, useState } from "react"

export const useEvalConfirmationDialog = (): [
  (
    filterFuncStr: string,
    userQuery: string,
    trialsCount: number
  ) => Promise<boolean>,
  () => ReactNode,
] => {
  const [openDialog, setOpenDialog] = useState(false)
  const [pendingFilterStr, setPendingFilterStr] = useState<string>("")
  const [pendingUserQuery, setPendingUserQuery] = useState<string>("")
  const [pendingTrialsCount, setPendingTrialsCount] = useState<number>(0)
  const [confirmResolve, setConfirmResolve] = useState<
    ((confirmed: boolean) => void) | null
  >(null)

  const showConfirmationDialog = (
    filterFuncStr: string,
    userQuery: string,
    trialsCount: number
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingFilterStr(filterFuncStr)
      setPendingUserQuery(userQuery)
      setPendingTrialsCount(trialsCount)
      setConfirmResolve(() => (confirmed: boolean) => {
        resolve(confirmed)
      })
      setOpenDialog(true)
    })
  }

  const handleConfirm = () => {
    if (confirmResolve) {
      confirmResolve(true)
    }
    cleanup()
  }

  const handleCancel = () => {
    if (confirmResolve) {
      confirmResolve(false)
    }
    cleanup()
  }

  const cleanup = () => {
    setOpenDialog(false)
    setPendingFilterStr("")
    setPendingUserQuery("")
    setPendingTrialsCount(0)
    setConfirmResolve(null)
  }

  const renderDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCancel}
        aria-labelledby="confirm-filter-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="confirm-filter-dialog-title">
          Confirm Filter Execution
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            The following JavaScript function will be executed to filter trials:
          </DialogContentText>
          <Box
            component="pre"
            sx={{
              backgroundColor: "grey.100",
              padding: 2,
              borderRadius: 1,
              overflow: "auto",
              maxHeight: "300px",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {pendingFilterStr}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>User Query:</strong> {pendingUserQuery}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Trials to filter:</strong> {pendingTrialsCount} trials
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" variant="contained">
            Execute
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return [showConfirmationDialog, renderDialog]
}