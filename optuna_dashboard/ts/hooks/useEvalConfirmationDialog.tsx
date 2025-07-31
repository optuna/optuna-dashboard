import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material"
import { ExpandLess, ExpandMore } from "@mui/icons-material"
import React, { ReactNode, useState } from "react"

export const useEvalConfirmationDialog = (
  onDenied?: () => void
): [
  (
    filterFuncStr: string,
    userQuery: string,
    trialsCount: number
  ) => Promise<boolean>,
  () => ReactNode,
] => {
  const [openDialog, setOpenDialog] = useState(false)
  const [pendingFilterStr, setPendingFilterStr] = useState<string>("")
  const [confirmResolve, setConfirmResolve] = useState<
    ((confirmed: boolean) => void) | null
  >(null)
  const [expanded, setExpanded] = useState(false)

  const ALLOW_ALWAYS_KEY = "optuna-dashboard-llm-eval-allow-always"

  const isAlwaysAllowed = () => {
    return sessionStorage.getItem(ALLOW_ALWAYS_KEY) === "true"
  }

  const showConfirmationDialog = (
    filterFuncStr: string,
    userQuery: string,
    trialsCount: number
  ): Promise<boolean> => {
    // Check if user has allowed always
    if (isAlwaysAllowed()) {
      return Promise.resolve(true)
    }

    return new Promise((resolve) => {
      setPendingFilterStr(filterFuncStr)
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

  const handleAllowAlways = () => {
    sessionStorage.setItem(ALLOW_ALWAYS_KEY, "true")
    if (confirmResolve) {
      confirmResolve(true)
    }
    cleanup()
  }

  const handleDenied = () => {
    if (confirmResolve) {
      confirmResolve(false)
    }
    // Call onDenied callback if provided
    if (onDenied) {
      onDenied()
    }
    cleanup()
  }

  const cleanup = () => {
    setOpenDialog(false)
    setPendingFilterStr("")
    setConfirmResolve(null)
    setExpanded(false)
  }

  const renderDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleDenied}
        aria-labelledby="confirm-filter-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="confirm-filter-dialog-title">
          Allow LLM to evaluate JavaScript function?
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="body1" sx={{ flexGrow: 1 }}>
              This will call eval() function in your web browser
            </Typography>
            <IconButton
              onClick={() => setExpanded(!expanded)}
              size="small"
              aria-label={expanded ? "collapse" : "expand"}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={expanded}>
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
                mb: 2,
              }}
            >
              {pendingFilterStr}
            </Box>
          </Collapse>

          <Typography variant="body2" color="warning.main" sx={{ fontWeight: "bold" }}>
            <strong>Review JavaScript function carefully before approving.</strong>{" "}
            Optuna Dashboard cannot guarantee the security of evaluating LLM generated content on your Web browser.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box>
            <Button onClick={handleAllowAlways} color="primary" sx={{ mr: 1 }}>
              Allow Always
            </Button>
            <Button onClick={handleConfirm} color="primary" variant="contained">
              Allow Once
            </Button>
          </Box>
          <Button onClick={handleDenied} color="primary">
            Deny
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return [showConfirmationDialog, renderDialog]
}