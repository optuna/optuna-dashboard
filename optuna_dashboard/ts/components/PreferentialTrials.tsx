import React, { FC, useState } from "react"
import {
  Typography,
  Box,
  useTheme,
  Card,
  CardContent,
  CardActions,
  CardActionArea,
  CardMedia,
  MenuItem,
  Select,
  FormControl,
  FormLabel,
  TextField,
  Modal,
} from "@mui/material"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import ReplayIcon from "@mui/icons-material/Replay"
import ClearIcon from "@mui/icons-material/Clear"
import IconButton from "@mui/material/IconButton"
import SettingsIcon from "@mui/icons-material/Settings"
import red from "@mui/material/colors/red"
import { useRecoilValue, useSetRecoilState } from "recoil"
import { actionCreator } from "../action"
import { MarkdownRenderer } from "./Note"
import {
  feedbackComponent,
  FeedbackComponentType,
  feedbackArtifactKey,
} from "../state"
import {
  TrialArtifactActions,
  TrialArtifactContent,
  TrialListDetail,
} from "./TrialList"

const FeedbackContent: FC<{
  trial: Trial
  artifact?: Artifact
}> = ({ trial, artifact }) => {
  const componentId = useRecoilValue(feedbackComponent)

  if (componentId === "note") {
    return <MarkdownRenderer body={trial.note.body} />
  }
  if (componentId === "artifact") {
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
  const componentId = useRecoilValue(feedbackComponent)
  const artifactKey = useRecoilValue(feedbackArtifactKey)
  const artifact = trial?.artifacts.find((a) => a.filename === artifactKey)

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
        <Typography variant="h5">
          Trial {trial.number}
          {componentId === "artifact" && artifact !== undefined
            ? ` (${artifact.filename})`
            : ""}
        </Typography>
        {componentId === "artifact" && artifact !== undefined ? (
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
            <FeedbackContent trial={trial} artifact={artifact} />
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
      <Modal open={detailShown} onClose={() => setDetailShown(false)}>
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
            <TrialListDetail
              trial={trial}
              isBestTrial={() => true}
              directions={[]}
              objectiveNames={[]}
            />
          </Box>
        </Box>
      </Modal>
    </Card>
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
  const outputComponent = useRecoilValue(feedbackComponent)
  const setOutputComponent = useSetRecoilState(feedbackComponent)
  const outputartifactKey = useRecoilValue(feedbackArtifactKey)
  const setOutputartifactKey = useSetRecoilState(feedbackArtifactKey)
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
      <ModalPage displayFlag={settingShown} setDisplayFlag={setSettingShown}>
        <Typography
          variant="h4"
          sx={{
            padding: theme.spacing(2),
            fontWeight: theme.typography.fontWeightBold,
          }}
        >
          Settings
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
            {outputComponent === "artifact" ? (
              <FormControl>
                <FormLabel component="legend">Output File:</FormLabel>
                <TextField
                  defaultValue={outputartifactKey}
                  onBlur={(e) => {
                    setOutputartifactKey(e.target.value)
                  }}
                />
              </FormControl>
            ) : null}
          </Box>
        </Typography>
      </ModalPage>
    </Box>
  )
}
