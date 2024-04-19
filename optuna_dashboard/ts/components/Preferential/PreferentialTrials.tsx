import ClearIcon from "@mui/icons-material/Clear"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import ReplayIcon from "@mui/icons-material/Replay"
import SettingsIcon from "@mui/icons-material/Settings"
import UndoIcon from "@mui/icons-material/Undo"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  MenuItem,
  Modal,
  Select,
  Typography,
  useTheme,
} from "@mui/material"
import IconButton from "@mui/material/IconButton"
import { red } from "@mui/material/colors"
import React, { FC, useEffect, useState } from "react"

import {
  Artifact,
  FeedbackComponentArtifact,
  FeedbackComponentNote,
  FeedbackComponentType,
  StudyDetail,
  Trial,
} from "ts/types/optuna"
import { actionCreator } from "../../action"
import {
  isThreejsArtifact,
  useThreejsArtifactModal,
} from "../Artifact/ThreejsArtifactViewer"
import { TrialListDetail } from "../TrialList"
import { PreferentialOutputComponent } from "./PreferentialOutputComponent"

const SettingsPage: FC<{
  studyDetail: StudyDetail
  settingShown: boolean
  setSettingShown: (flag: boolean) => void
}> = ({ studyDetail, settingShown, setSettingShown }) => {
  const actions = actionCreator()
  const [outputComponentType, setOutputComponentType] = useState(
    studyDetail.feedback_component_type.output_type
  )
  const [artifactKey, setArtifactKey] = useState(
    studyDetail.feedback_component_type.output_type === "artifact"
      ? studyDetail.feedback_component_type.artifact_key
      : undefined
  )
  useEffect(() => {
    setOutputComponentType(studyDetail.feedback_component_type.output_type)
  }, [studyDetail.feedback_component_type.output_type])
  useEffect(() => {
    if (studyDetail.feedback_component_type.output_type === "artifact") {
      setArtifactKey(studyDetail.feedback_component_type.artifact_key)
    }
  }, [
    studyDetail.feedback_component_type.output_type === "artifact"
      ? studyDetail.feedback_component_type.artifact_key
      : undefined,
  ])
  const onClose = () => {
    setSettingShown(false)
  }
  const onApply = () => {
    setSettingShown(false)
    const outputComponent: FeedbackComponentType =
      outputComponentType === "note"
        ? ({ output_type: "note" } as FeedbackComponentNote)
        : ({
            output_type: "artifact",
            artifact_key: artifactKey,
          } as FeedbackComponentArtifact)
    actions.updateFeedbackComponent(studyDetail.id, outputComponent)
  }

  return (
    <Dialog
      open={settingShown}
      onClose={onClose}
      maxWidth="sm"
      fullWidth={true}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FormControl component="fieldset">
          <FormLabel component="legend">Output Component:</FormLabel>
          <Select
            value={outputComponentType}
            onChange={(e) => {
              setOutputComponentType(e.target.value as "note" | "artifact")
            }}
          >
            <MenuItem value="note">Note</MenuItem>
            <MenuItem value="artifact">Artifact</MenuItem>
          </Select>
        </FormControl>
        {outputComponentType === "artifact" ? (
          <FormControl
            component="fieldset"
            disabled={studyDetail.union_user_attrs.length === 0}
          >
            <FormLabel component="legend">
              User Attribute Key Corresponding to Output Artifact Id:
            </FormLabel>
            <Select
              value={
                studyDetail.union_user_attrs.length !== 0
                  ? artifactKey ?? ""
                  : "error"
              }
              onChange={(e) => {
                setArtifactKey(e.target.value)
              }}
            >
              {studyDetail.union_user_attrs.length === 0 ? (
                <MenuItem value="error">No user attributes</MenuItem>
              ) : null}
              {studyDetail.union_user_attrs.map((attr, index) => {
                return (
                  <MenuItem key={index} value={attr.key}>
                    {attr.key}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={onApply}
          color="primary"
          disabled={
            outputComponentType === "artifact" && artifactKey === undefined
          }
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const isComparisonReady = (
  trial: Trial,
  componentType: FeedbackComponentType
): boolean => {
  if (componentType === undefined || componentType.output_type === "note") {
    return trial.note.body !== ""
  }
  if (componentType.output_type === "artifact") {
    const artifactId = trial?.user_attrs.find(
      (a) => a.key === componentType.artifact_key
    )?.value
    const artifact = trial?.artifacts.find((a) => a.artifact_id === artifactId)
    return artifact !== undefined
  }
  return false
}

export const getArtifactUrlPath = (
  studyId: number,
  trialId: number,
  artifactId: string
): string => {
  return `/artifacts/${studyId}/${trialId}/${artifactId}`
}

const PreferentialTrial: FC<{
  trial?: Trial
  studyDetail: StudyDetail
  candidates: number[]
  hideTrial: () => void
  openDetailTrial: () => void
  openThreejsArtifactModal: (urlPath: string, artifact: Artifact) => void
}> = ({
  trial,
  studyDetail,
  candidates,
  hideTrial,
  openDetailTrial,
  openThreejsArtifactModal,
}) => {
  const theme = useTheme()
  const action = actionCreator()
  const [buttonHover, setButtonHover] = useState(false)
  const trialWidth = 400
  const trialHeight = 300
  const componentType = studyDetail.feedback_component_type
  const artifactId =
    componentType.output_type === "artifact"
      ? trial?.user_attrs.find((a) => a.key === componentType.artifact_key)
          ?.value
      : undefined
  const artifact = trial?.artifacts.find((a) => a.artifact_id === artifactId)
  const urlPath =
    trial !== undefined && artifactId !== undefined
      ? getArtifactUrlPath(studyDetail.id, trial?.trial_id, artifactId)
      : ""
  const is3dModel =
    componentType.output_type === "artifact" &&
    artifact !== undefined &&
    isThreejsArtifact(artifact)

  if (trial === undefined) {
    return (
      <Box
        component="div"
        sx={{
          width: trialWidth,
          minHeight: trialHeight,
          margin: theme.spacing(2),
        }}
      />
    )
  }

  const onFeedback = () => {
    hideTrial()
    action.updatePreference(trial.study_id, candidates, trial.number)
  }
  const isReady = isComparisonReady(trial, componentType)

  return (
    <Card
      sx={{
        width: trialWidth,
        minHeight: trialHeight,
        margin: theme.spacing(2),
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardActions>
        <Box
          component="div"
          sx={{
            margin: theme.spacing(0, 2),
            maxWidth: `calc(${trialWidth}px - ${
              is3dModel ? theme.spacing(8) : theme.spacing(4)
            })`,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <Typography variant="h5">Trial {trial.number}</Typography>
          {componentType.output_type === "artifact" &&
          artifact !== undefined ? (
            <Typography
              variant="h6"
              sx={{
                margin: theme.spacing(0, 2),
              }}
            >
              {`(${artifact.filename})`}
            </Typography>
          ) : null}
        </Box>
        {is3dModel ? (
          <IconButton
            aria-label="show artifact 3d model"
            size="small"
            color="inherit"
            sx={{ marginLeft: "auto" }}
            onClick={() => {
              openThreejsArtifactModal(urlPath, artifact)
            }}
          >
            <FullscreenIcon />
          </IconButton>
        ) : null}
        <IconButton
          sx={{
            marginLeft: "auto",
          }}
          onClick={() => {
            hideTrial()
            action.skipPreferentialTrial(trial.study_id, trial.trial_id)
          }}
          aria-label="skip trial"
        >
          <ReplayIcon />
        </IconButton>
        <IconButton
          sx={{
            marginLeft: "auto",
          }}
          onClick={openDetailTrial}
          aria-label="show detail"
        >
          <OpenInFullIcon />
        </IconButton>
      </CardActions>
      <CardContent
        aria-label="trial-button"
        onClick={(e) => {
          if (e.shiftKey) onFeedback()
        }}
        sx={{
          position: "relative",
          padding: theme.spacing(2),
          overflow: "hidden",
          minHeight: theme.spacing(20),
        }}
      >
        {isReady ? (
          <>
            <PreferentialOutputComponent
              trial={trial}
              artifact={artifact}
              componentType={componentType}
              urlPath={urlPath}
            />
            <Box
              component="div"
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor:
                  theme.palette.mode === "dark" ? "white" : "black",
                opacity: buttonHover ? 0.2 : 0,
                zIndex: 1,
                transition: "opacity 0.3s ease-out",
                pointerEvents: "none",
              }}
            />
            <ClearIcon
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                color: red[600],
                opacity: buttonHover ? 0.3 : 0,
                transition: "opacity 0.3s ease-out",
                zIndex: 1,
                filter: buttonHover
                  ? theme.palette.mode === "dark"
                    ? "brightness(1.1)"
                    : "brightness(1.7)"
                  : "none",
                pointerEvents: "none",
              }}
            />
          </>
        ) : (
          <CircularProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: "auto",
            }}
          />
        )}
      </CardContent>
      <Button
        variant="outlined"
        onClick={onFeedback}
        onMouseEnter={() => {
          setButtonHover(true)
        }}
        onMouseLeave={() => {
          setButtonHover(false)
        }}
        color="error"
        disabled={!isReady && candidates.length > 0}
        sx={{
          marginTop: "auto",
        }}
      >
        <ClearIcon />
        Worst
      </Button>
    </Card>
  )
}

type DisplayTrials = {
  display: number[]
  clicked: number[]
}

export const PreferentialTrials: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const action = actionCreator()
  const [undoHistoryFlag, setUndoHistoryFlag] = useState(false)
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()
  const [displayTrials, setDisplayTrials] = useState<DisplayTrials>({
    display: [],
    clicked: [],
  })
  const [settingShown, setSettingShown] = useState(false)
  const [detailTrial, setDetailTrial] = useState<number | null>(null)

  if (studyDetail === null || !studyDetail.is_preferential) {
    return null
  }

  const hiddenTrials = new Set(
    studyDetail.preference_history
      ?.filter((h) => !h.is_removed)
      .map((p) => p.clicked)
      .concat(studyDetail.skipped_trial_numbers) ?? []
  )
  const activeTrials = studyDetail.trials.filter(
    (t) =>
      (t.state === "Running" || t.state === "Complete") &&
      !hiddenTrials.has(t.number)
  )
  const newTrials = activeTrials.filter(
    (t) =>
      !displayTrials.display.includes(t.number) &&
      !displayTrials.clicked.includes(t.number)
  )
  const deleteTrials = displayTrials.display.filter(
    (t) => t !== -1 && !activeTrials.map((t) => t.number).includes(t)
  )
  if (newTrials.length > 0 || deleteTrials.length > 0) {
    setDisplayTrials((prev) => {
      const display = [...prev.display].map((t) =>
        deleteTrials.includes(t) ? -1 : t
      )
      const clicked = [...prev.clicked]
      newTrials.map((t) => {
        const index = display.findIndex((n) => n === -1)
        if (index === -1) {
          display.push(t.number)
          clicked.push(-1)
        } else {
          display[index] = t.number
        }
      })
      return {
        display: display,
        clicked: clicked,
      }
    })
  }

  const hideTrial = (num: number) => {
    setDisplayTrials((prev) => {
      const index = prev.display.findIndex((n) => n === num)
      if (index === -1) {
        return prev
      }
      const display = [...prev.display]
      const clicked = [...prev.clicked]
      display[index] = -1
      clicked[index] = num
      return {
        display: display,
        clicked: clicked,
      }
    })
  }
  const visibleTrial = (num: number) => {
    setDisplayTrials((prev) => {
      const index = prev.clicked.findIndex((n) => n === num)
      if (index === -1) {
        return prev
      }
      const clicked = [...prev.clicked]
      clicked[index] = -1
      return {
        display: prev.display,
        clicked: clicked,
      }
    })
  }
  const latestHistoryId =
    studyDetail?.preference_history?.filter((h) => !h.is_removed).pop()?.id ??
    null

  return (
    <Box component="div" padding={theme.spacing(2)}>
      <Box component="div" display="flex">
        <Typography
          variant="h4"
          sx={{
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
          Which trial is the worst?
        </Typography>
        <Box
          component="div"
          display="flex"
          sx={{
            marginLeft: "auto",
          }}
        >
          <Button
            variant="outlined"
            disabled={latestHistoryId === null || undoHistoryFlag}
            sx={{
              marginRight: theme.spacing(2),
            }}
            startIcon={<UndoIcon />}
            onClick={() => {
              if (latestHistoryId === null) {
                return
              }
              setUndoHistoryFlag(true)
              const clicked = studyDetail.preference_history
                ?.filter((h) => h.id === latestHistoryId)
                ?.pop()?.clicked
              if (clicked !== undefined) visibleTrial(clicked)
              action.removePreferentialHistory(studyDetail.id, latestHistoryId)
              setUndoHistoryFlag(false)
            }}
          >
            Undo
          </Button>
          <Button
            variant="outlined"
            sx={{
              marginRight: theme.spacing(2),
            }}
            startIcon={<SettingsIcon />}
            onClick={() => setSettingShown(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>
      <Box
        component="div"
        sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}
      >
        {displayTrials.display.map((t, index) => {
          const trial = activeTrials.find((trial) => trial.number === t)
          const candidates = displayTrials.display.filter(
            (n) =>
              n !== -1 &&
              isComparisonReady(
                studyDetail.trials[n],
                studyDetail.feedback_component_type
              )
          )
          return (
            <PreferentialTrial
              key={t === -1 ? -index - 1 : t}
              trial={trial}
              studyDetail={studyDetail}
              candidates={candidates}
              hideTrial={() => hideTrial(t)}
              openDetailTrial={() => setDetailTrial(t)}
              openThreejsArtifactModal={openThreejsArtifactModal}
            />
          )
        })}
      </Box>
      <SettingsPage
        settingShown={settingShown}
        setSettingShown={setSettingShown}
        studyDetail={studyDetail}
      />
      {detailTrial !== null && (
        <Modal open={true} onClose={() => setDetailTrial(null)}>
          <Box
            component="div"
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "80%",
              maxHeight: "90%",
              margin: "auto",
              overflow: "hidden",
              backgroundColor: theme.palette.background.default,
              borderRadius: theme.spacing(3),
            }}
          >
            <Box
              component="div"
              sx={{
                width: "100%",
                height: "100%",
                overflow: "auto",
                position: "relative",
              }}
            >
              <IconButton
                sx={{
                  position: "absolute",
                  top: theme.spacing(2),
                  right: theme.spacing(2),
                }}
                onClick={() => setDetailTrial(null)}
              >
                <ClearIcon />
              </IconButton>
              <TrialListDetail
                trial={studyDetail.trials[detailTrial]}
                isBestTrial={(trialId) =>
                  studyDetail.trials.find((t) => t.trial_id === trialId)
                    ?.state === "Complete" ?? false
                }
                directions={[]}
                objectiveNames={[]}
              />
            </Box>
          </Box>
        </Modal>
      )}
      {renderThreejsArtifactModal()}
    </Box>
  )
}
