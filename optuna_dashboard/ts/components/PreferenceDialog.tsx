import React, { useEffect, useState } from "react"
import MuiDialogTitle from "@mui/material/DialogTitle"
import CloseIcon from "@mui/icons-material/Close"
import MuiDialogContent from "@mui/material/DialogContent"
import FormControlLabel from "@mui/material/FormControlLabel"
import {
  Dialog,
  Checkbox,
  Typography,
  IconButton,
  FormGroup,
  useTheme,
  FormLabel,
} from "@mui/material"
import { useRecoilValue } from "recoil"
import { graphVisibilityState } from "../state"
import { actionCreator } from "../action"

type UsePreferenceDialogReturn = [(open: boolean) => void, () => JSX.Element]

export const usePreferenceDialog = (
  studyDetail: StudyDetail | null
): UsePreferenceDialogReturn => {
  const theme = useTheme()
  const action = actionCreator()
  const globalGraphVisibility =
    useRecoilValue<GraphVisibility>(graphVisibilityState)
  const [localGraphVisibility, setLocalGraphVisibility] =
    useState<GraphVisibility>(globalGraphVisibility)

  useEffect(() => {
    action.getGraphVisibility()
  }, [])

  useEffect(() => {
    setLocalGraphVisibility(globalGraphVisibility)
  }, [globalGraphVisibility])

  const [prefOpen, setPrefOpen] = useState(false)
  const handleClose = () => {
    setPrefOpen(false)
    action.saveGraphVisibility(localGraphVisibility)
  }
  const handlePreferenceOnChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLocalGraphVisibility({
      ...localGraphVisibility,
      [event.target.name]: event.target.checked,
    })
  }
  const renderSelectBox = (onChange: (e) => void): ReactNode => (
    <Select value={0} onChange={onChange}>
      {targets.map((t, i) => (
        <MenuItem value={i} key={i}>
          {t.toLabel()}
        </MenuItem>
      ))}
    </Select>
  )

  const renderPreferenceDialog = () => {
    return (
      <Dialog onClose={handleClose} aria-labelledby="vis-pref" open={prefOpen}>
        <MuiDialogTitle
          sx={{
            margin: 0,
            padding: theme.spacing(2),
            minWidth: 300,
          }}
        >
          <Typography variant="h6">Preferences</Typography>
          <IconButton
            aria-label="close"
            sx={{
              position: "absolute",
              right: theme.spacing(1),
              top: theme.spacing(1),
              color: theme.palette.grey[500],
            }}
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </MuiDialogTitle>
        <MuiDialogContent dividers>
          <FormLabel component="legend">Charts</FormLabel>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.history}
                  onChange={handlePreferenceOnChange}
                  name="history"
                />
              }
              label="History"
            />
            <FormControlLabel
              disabled={studyDetail?.directions?.length === 1}
              control={
                <Checkbox
                  checked={localGraphVisibility.paretoFront}
                  onChange={handlePreferenceOnChange}
                  name="paretoFront"
                />
              }
              label="Pareto Front"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.parallelCoordinate}
                  onChange={handlePreferenceOnChange}
                  name="parallelCoordinate"
                />
              }
              label="Parallel Coordinate"
            />
            <FormControlLabel
              disabled={
                studyDetail !== null &&
                (studyDetail.directions.length > 1 ||
                  !studyDetail.has_intermediate_values)
              }
              control={
                <Checkbox
                  checked={localGraphVisibility.intermediateValues}
                  onChange={handlePreferenceOnChange}
                  name="intermediateValues"
                />
              }
              label="Intermediate Values"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.edf}
                  onChange={handlePreferenceOnChange}
                  name="edf"
                />
              }
              label="EDF"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.contour}
                  onChange={handlePreferenceOnChange}
                  name="contour"
                />
              }
              label="Contour"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.importances}
                  onChange={handlePreferenceOnChange}
                  name="importances"
                />
              }
              label="Hyperparameter Importances"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={localGraphVisibility.slice}
                  onChange={handlePreferenceOnChange}
                  name="slice"
                />
              }
              label="Slice"
            />
          </FormGroup>
        </MuiDialogContent>
      </Dialog>
    )
  }
  return [setPrefOpen, renderPreferenceDialog]
}
