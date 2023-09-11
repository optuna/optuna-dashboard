import React, { FC, useEffect, useState } from "react"
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
import { Details } from "@mui/icons-material"

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
    studyDetail?.feedback_component_type ?? "Note"
  )
  const [outputArtifactKey, setOutputArtifactKey] = useState(
    studyDetail?.feedback_artifact_key ?? ""
  )
  useEffect(() => {
    if (studyDetail.feedback_component_type !== undefined) {
      setOutputComponent(studyDetail.feedback_component_type)
    }
    if (studyDetail.feedback_artifact_key !== undefined) {
      setOutputArtifactKey(studyDetail.feedback_artifact_key)
    }
  }, [studyDetail.feedback_component_type, studyDetail.feedback_artifact_key])
  const onClose = () => {
    setSettingShown(false)
    actions.updateFeedbackComponent(
      studyDetail.id,
      outputComponent,
      outputArtifactKey
    )
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
            <MenuItem value="Note">Note</MenuItem>
            <MenuItem value="Artifact">Artifact</MenuItem>
          </Select>
        </FormControl>
        {outputComponent === "Artifact" ? (
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
                  ? outputArtifactKey
                  : "error"
              }
              onChange={(e) => {
                setOutputArtifactKey(e.target.value)
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

const FeedbackContent: FC<{
  trial: Trial
  artifact?: Artifact
  componentId: FeedbackComponentType
  width: string
  minHeight: string
  urlPath: string
}> = ({ trial, artifact, componentId, width, minHeight, urlPath }) => {
  if (componentId === "Note") {
    return <MarkdownRenderer body={trial.note.body} />
  }
  if (componentId === "Artifact") {
    if (artifact === undefined) {
      return null
    }
    return (
      <ArtifactCardMedia artifact={artifact} urlPath={urlPath} height="100%" />
    )
  }

  return null
}

type DisplayTrials = {
  numbers: number[]
  last_number: number
}

export const PreferentialTrials: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  const theme = useTheme()
  const action = actionCreator()
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()
  const runningTrials =
    studyDetail?.trials.filter((t) => t.state === "Running") ?? []
  const activeTrials = runningTrials.concat(studyDetail?.best_trials ?? [])

  const [displayTrials, setDisplayTrials] = useState<DisplayTrials>({
    numbers: activeTrials.map((t) => t.number),
    last_number: Math.max(...activeTrials.map((t) => t.number), -1),
  })
  const [settingShown, setSettingShown] = useState(false)
  const [detailTrial, setDetailTrial] = useState<number | null>(null)
  const [buttonHover, setButtonHover] = useState<number | null>(null)

  const trialWidth = 400
  const trialHeight = 300

  if (studyDetail === null || !studyDetail.is_preferential) {
    return null
  }
  const new_trails = activeTrials.filter(
    (t) =>
      displayTrials.last_number < t.number &&
      displayTrials.numbers.find((n) => n === t.number) === undefined
  )
  if (new_trails.length > 0) {
    setDisplayTrials((display) => {
      const numbers = [...display.numbers]
      new_trails.map((t) => {
        const index = numbers.findIndex((n) => n === -1)
        if (index === -1) {
          numbers.push(t.number)
        } else {
          numbers[index] = t.number
        }
      })
      return {
        numbers: numbers,
        last_number: Math.max(...numbers, -1),
      }
    })
  }

  const hideTrial = (num: number) => {
    setDisplayTrials((display) => {
      const index = display.numbers.findIndex((n) => n === num)
      if (index === -1) {
        return display
      }
      const numbers = [...displayTrials.numbers]
      numbers[index] = -1
      return {
        numbers: numbers,
        last_number: display.last_number,
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
        {displayTrials.numbers.map((t, index) => {
          const trial = activeTrials.find((trial) => trial.number === t)
          const candidates = displayTrials.numbers.filter((n) => n !== -1)
          const componentId = studyDetail.feedback_component_type ?? "Note"
          const artifactKey = studyDetail.feedback_artifact_key
          const artifactId = trial?.user_attrs.find(
            (a) => a.key === artifactKey
          )?.value
          const artifact = trial?.artifacts.find(
            (a) => a.artifact_id === artifactId
          )
          const urlPath = `/artifacts/${studyDetail.id}/${trial?.trial_id}/${artifact?.artifact_id}`

          if (trial == undefined) {
            return (
              <Box
                key={-index - 1}
                sx={{
                  width: trialWidth,
                  minHeight: trialHeight,
                  margin: theme.spacing(2),
                }}
              />
            )
          }

          const is3dModel =
            componentId === "Artifact" &&
            artifact !== undefined &&
            isThreejsArtifact(artifact)
          const onFeedback = () => {
            hideTrial(trial.number)
            action.updatePreference(trial.study_id, candidates, trial.number)
          }

          return (
            <Card
              key={trial.number}
              sx={{
                width: trialWidth,
                minHeight: trialHeight,
                margin: theme.spacing(2),
                padding: 0,
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
                  {componentId === "Artifact" && artifact !== undefined ? (
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
                    hideTrial(trial.number)
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
                  onClick={() => setDetailTrial(trial.number)}
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
                <FeedbackContent
                  trial={trial}
                  artifact={artifact}
                  componentId={componentId}
                  width={`${trialWidth}px`}
                  minHeight="100%"
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
                    opacity: buttonHover === trial.number ? 0.2 : 0,
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
                    opacity: buttonHover === trial.number ? 0.3 : 0,
                    transition: "opacity 0.3s ease-out",
                    zIndex: 1,
                    filter:
                      buttonHover === trial.number
                        ? theme.palette.mode === "dark"
                          ? "brightness(1.1)"
                          : "brightness(1.7)"
                        : "none",
                    pointerEvents: "none",
                  }}
                />
              </CardContent>
              <Button
                variant="outlined"
                onClick={onFeedback}
                onMouseEnter={() => {
                  setButtonHover(trial.number)
                }}
                onMouseLeave={() => {
                  setButtonHover((prev) =>
                    prev === trial.number ? null : prev
                  )
                }}
                color="error"
              >
                <ClearIcon />
                Worst
              </Button>
            </Card>
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
