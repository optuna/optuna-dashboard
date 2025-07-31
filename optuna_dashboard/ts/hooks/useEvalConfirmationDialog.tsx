import { ExpandLess, ExpandMore } from "@mui/icons-material"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
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
  useTheme,
} from "@mui/material"
import React, { ReactNode, useState } from "react"

export const useEvalConfirmationDialog = (
  onDenied?: () => void
): [
  (filterFuncStr: string, userQuery: string) => Promise<boolean>,
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

  const showConfirmationDialog = (filterFuncStr: string): Promise<boolean> => {
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

  const handleAllowOnce = () => {
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
    const theme = useTheme()

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
          <Box
            sx={{
              backgroundColor:
                theme.palette.mode === "dark" ? "grey.800" : "grey.100",
              padding: 2,
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: expanded ? 2 : 0,
              }}
            >
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
                  backgroundColor:
                    theme.palette.mode === "dark" ? "grey.900" : "grey.200",
                  color: theme.palette.mode === "dark" ? "grey.100" : "inherit",
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
            </Collapse>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <ReportProblemIcon
              color="warning"
              sx={{ mr: 1, fontSize: "1.2rem" }}
            />
            <Typography
              variant="body2"
              color="warning.main"
              sx={{ fontWeight: "bold" }}
            >
              <strong>
                Review JavaScript function carefully before approving.
              </strong>{" "}
              Optuna Dashboard cannot guarantee the security of evaluating LLM
              generated content on your Web browser.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          <Box>
            <Button
              onClick={handleAllowAlways}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Allow Always
            </Button>
            <Button onClick={handleAllowOnce} variant="outlined">
              Allow Once
            </Button>
          </Box>
          <Button onClick={handleDenied} color="error" variant="contained">
            Deny
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  return [showConfirmationDialog, renderDialog]
}
