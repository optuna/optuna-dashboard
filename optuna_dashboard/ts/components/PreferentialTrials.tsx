import React, { FC, useEffect, useState } from "react"
import {
  Typography,
  Box,
  useTheme,
  Card,
  CardContent,
  CardActions,
  CardActionArea,
  MenuItem,
  Select,
  FormControl,
  FormLabel,
  Modal,
} from "@mui/material"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import ReplayIcon from "@mui/icons-material/Replay"
import ClearIcon from "@mui/icons-material/Clear"
import IconButton from "@mui/material/IconButton"
import SettingsIcon from "@mui/icons-material/Settings"
import red from "@mui/material/colors/red"
import { actionCreator } from "../action"
import { MarkdownRenderer } from "./Note"
import {
  TrialArtifactActions,
  TrialArtifactContent,
  TrialListDetail,
} from "./TrialList"

const FeedbackContent: FC<{
  trial: Trial
  artifact?: Artifact
  componentId: FeedbackComponentType
}> = ({ trial, artifact, componentId }) => {
  if (componentId === "Note") {
    return <MarkdownRenderer body={trial.note.body} />
  }
  if (componentId === "Artifact") {
    if (artifact === undefined) {
      return null
    }
    return (
      <TrialArtifactContent
        trial={trial}
        artifact={artifact}
        width={"100%"}
        height={"100%"}
      />
    )
  }

  return null
}

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
          backgroundColor: theme.palette.mode === "dark" ? "black" : "white",
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

const PreferentialTrial: FC<{
  trial?: Trial
  studyDetail: StudyDetail
  hideTrial: () => void
}> = ({ trial, studyDetail, hideTrial }) => {
  const theme = useTheme()
  const action = actionCreator()
  const trialWidth = 500
  const trialHeight = 300
  const [detailShown, setDetailShown] = useState(false)
  const componentId = studyDetail.feedback_component_type ?? "Note"
  const artifactKey = studyDetail.feedback_artifact_key
  const artifactId = trial?.user_attrs.find((a) => a.key === artifactKey)?.value
  const artifact = trial?.artifacts.find((a) => a.artifact_id === artifactId)

  if (trial == undefined) {
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

  return (
    <Card
      sx={{
        width: trialWidth,
        minHeight: trialHeight,
        margin: theme.spacing(2),
        padding: 0,
      }}
    >
      <CardActions>
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
        {componentId === "Artifact" && artifact !== undefined ? (
          <TrialArtifactActions
            trial={trial}
            artifact={artifact}
            sx={{ marginLeft: "auto" }}
          />
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
          onClick={() => setDetailShown(true)}
          aria-label="show detail"
        >
          <OpenInFullIcon />
        </IconButton>
      </CardActions>
      <CardActionArea>
        <CardContent
          aria-label="trial-button"
          onClick={() => {
            hideTrial()
            const best_trials = studyDetail.best_trials
              .map((t) => t.number)
              .filter((t) => t !== trial.number)
            action.updatePreference(trial.study_id, best_trials, [trial.number])
          }}
          sx={{
            padding: 0,
            position: "relative",
            overflow: "hidden",
            "::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor:
                theme.palette.mode === "dark" ? "white" : "black",
              opacity: 0,
              zIndex: 1,
              transition: "opacity 0.3s ease-out",
            },
            ":hover::before": {
              opacity: 0.2,
            },
          }}
        >
          <Box
            sx={{
              padding: theme.spacing(2),
            }}
          >
            <FeedbackContent
              trial={trial}
              artifact={artifact}
              componentId={studyDetail.feedback_component_type ?? "Note"}
            />
          </Box>

          <ClearIcon
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              color: red[600],
              opacity: 0,
              transition: "opacity 0.3s ease-out",
              zIndex: 1,
              ":hover": {
                opacity: 0.3,
                filter:
                  theme.palette.mode === "dark"
                    ? "brightness(1.1)"
                    : "brightness(1.7)",
              },
            }}
          />
        </CardContent>
      </CardActionArea>
      <ModalPage
        displayFlag={detailShown}
        onClose={() => {
          setDetailShown(false)
        }}
      >
        <TrialListDetail
          trial={trial}
          isBestTrial={() => true}
          directions={[]}
          objectiveNames={[]}
        />
      </ModalPage>
    </Card>
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

type DisplayTrials = {
  numbers: number[]
  last_number: number
}

export const PreferentialTrials: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  if (studyDetail === null || !studyDetail.is_preferential) {
    return null
  }
  const theme = useTheme()
  const [displayTrials, setDisplayTrials] = useState<DisplayTrials>({
    numbers: studyDetail.best_trials.map((t) => t.number),
    last_number: Math.max(...studyDetail.best_trials.map((t) => t.number), -1),
  })
  const [settingShown, setSettingShown] = useState(false)
  const new_trails = studyDetail.best_trials.filter(
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
        {displayTrials.numbers.map((t, index) => (
          <PreferentialTrial
            key={index}
            trial={studyDetail.best_trials.find((trial) => trial.number === t)}
            studyDetail={studyDetail}
            hideTrial={() => {
              hideTrial(t)
            }}
          />
        ))}
      </Box>
      <SettingsPage
        settingShown={settingShown}
        setSettingShown={setSettingShown}
        studyDetail={studyDetail}
      />
    </Box>
  )
}
