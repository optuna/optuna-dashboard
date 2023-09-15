import React, { FC, useEffect, useState, useMemo } from "react"
import {
  Typography,
  Box,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Button,
  MenuItem,
  Select,
  FormControl,
  FormLabel,
  Modal,
  CircularProgress,
} from "@mui/material"
import IconButton from "@mui/material/IconButton"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import ReplayIcon from "@mui/icons-material/Replay"
import ClearIcon from "@mui/icons-material/Clear"
import SettingsIcon from "@mui/icons-material/Settings"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import red from "@mui/material/colors/red"

import { actionCreator } from "../action"
import { TrialListDetail } from "./TrialList"
import {
  isThreejsArtifact,
  useThreejsArtifactModal,
} from "./ThreejsArtifactViewer"
import { ArtifactCardMedia } from "./ArtifactCardMedia"
import { MarkdownRenderer } from "./Note"

const ModalPage: FC<{
  children: React.ReactNode
  displayFlag: boolean
  onClose: () => void
}> = ({ children, displayFlag, onClose }) => {
  const theme = useTheme()
  return (
    <Modal open={displayFlag} onClose={onClose}>
      <Box
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
          sx={{
            width: "100%",
            height: "100%",
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Modal>
  )
}

const SettingsPage: FC<{
  studyDetail: StudyDetail
  settingShown: boolean
  setSettingShown: (flag: boolean) => void
}> = ({ studyDetail, settingShown, setSettingShown }) => {
  const theme = useTheme()
  const actions = actionCreator()
  const [outputComponent, setOutputComponent] = useState(
    studyDetail.feedback_component_type
  )
  useEffect(() => {
    setOutputComponent(studyDetail.feedback_component_type)
  }, [studyDetail.feedback_component_type])
  const onClose = () => {
    setSettingShown(false)
    actions.updateFeedbackComponent(studyDetail.id, outputComponent)
  }

  return (
    <ModalPage displayFlag={settingShown} onClose={onClose}>
      <Typography
        variant="h4"
        sx={{
          padding: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Settings
      </Typography>
      <Box
        sx={{
          padding: theme.spacing(2),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FormControl component="fieldset">
          <FormLabel component="legend">Output Component:</FormLabel>
          <Select
            value={outputComponent}
            onChange={(e) => {
              setOutputComponent(e.target.value as FeedbackComponentType)
            }}
          >
            <MenuItem value="note">Note</MenuItem>
            <MenuItem value="artifact">Artifact</MenuItem>
          </Select>
        </FormControl>
        {outputComponent.output_type === "artifact" ? (
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
                  ? outputComponent.artifact_key
                  : "error"
              }
              onChange={(e) => {
                setOutputComponent({
                  ...outputComponent,
                  artifact_key: e.target.value as string,
                })
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
      </Box>
    </ModalPage>
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

export const OutputContent: FC<{
  trial: Trial
  artifact?: Artifact
  componentType: FeedbackComponentType
  urlPath: string
}> = ({ trial, artifact, componentType, urlPath }) => {
  const note = useMemo(() => {
    return <MarkdownRenderer body={trial.note.body} />
  }, [trial.note.body])
  if (componentType === undefined || componentType.output_type === "note") {
    return note
  }
  if (componentType.output_type === "artifact") {
    if (artifact === undefined) {
      return null
    }
    return (
      <ArtifactCardMedia artifact={artifact} urlPath={urlPath} height="100%" />
    )
  }
  return null
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
            <OutputContent
              trial={trial}
              artifact={artifact}
              componentType={componentType}
              urlPath={urlPath}
            />
            <Box
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
        disabled={!isReady}
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
      ?.map((p) => p.clicked)
      .concat(studyDetail.skipped_trials) ?? []
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

  return (
    <Box
      padding={theme.spacing(2)}
      sx={{
        position: "relative",
      }}
    >
      <IconButton
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          margin: theme.spacing(1),
        }}
        onClick={() => setSettingShown(true)}
      >
        <SettingsIcon />
      </IconButton>
      <Typography
        variant="h4"
        sx={{
          marginBottom: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Which trial is the worst?
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}>
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
        <ModalPage
          displayFlag={true}
          onClose={() => {
            setDetailTrial(null)
          }}
        >
          <TrialListDetail
            trial={studyDetail.trials[detailTrial]}
            isBestTrial={(trialId) =>
              studyDetail.trials.find((t) => t.trial_id === trialId)?.state ===
                "Complete" ?? false
            }
            directions={[]}
            objectiveNames={[]}
          />
        </ModalPage>
      )}
      {renderThreejsArtifactModal()}
    </Box>
  )
}
