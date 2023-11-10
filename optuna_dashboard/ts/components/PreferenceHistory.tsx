import React, { FC, useState } from "react"
import {
  Typography,
  Box,
  useTheme,
  Card,
  CardContent,
  CardActions,
} from "@mui/material"
import ClearIcon from "@mui/icons-material/Clear"
import IconButton from "@mui/material/IconButton"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash"
import DeleteIcon from "@mui/icons-material/Delete"
import Modal from "@mui/material/Modal"
import { red } from "@mui/material/colors"

import { TrialListDetail } from "./TrialList"
import { getArtifactUrlPath } from "./PreferentialTrials"
import { formatDate } from "../dateUtil"
import { actionCreator } from "../action"
import { useStudyDetailValue } from "../state"
import { PreferentialOutputComponent } from "./PreferentialOutputComponent"

type TrialType = "worst" | "none"

const CandidateTrial: FC<{
  trial: Trial
  type: TrialType
}> = ({ trial, type }) => {
  const theme = useTheme()
  const trialWidth = 300
  const trialHeight = 300
  const studyDetail = useStudyDetailValue(trial.study_id)
  const [detailShown, setDetailShown] = useState(false)

  if (studyDetail === null) {
    return null
  }
  const componentType = studyDetail.feedback_component_type
  const artifactId =
    componentType.output_type === "artifact"
      ? trial.user_attrs.find((a) => a.key === componentType.artifact_key)
          ?.value
      : undefined
  const artifact = trial.artifacts.find((a) => a.artifact_id === artifactId)
  const urlPath =
    artifactId !== undefined
      ? getArtifactUrlPath(trial.study_id, trial.trial_id, artifactId)
      : ""

  const cardComponentSx = {
    padding: 0,
    position: "relative",
    overflow: "hidden",
    "::before": {},
  }
  if (type !== "none") {
    cardComponentSx["::before"] = {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: theme.palette.mode === "dark" ? "white" : "black",
      opacity: 0.2,
      zIndex: 1,
      transition: "opacity 0.3s ease-out",
    }
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
      <CardContent aria-label="trial" sx={cardComponentSx}>
        <Box
          sx={{
            padding: theme.spacing(2),
          }}
        >
          <PreferentialOutputComponent
            trial={trial}
            artifact={artifact}
            componentType={componentType}
            urlPath={urlPath}
          />
        </Box>

        {type === "worst" ? (
          <ClearIcon
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              color: red[600],
              zIndex: 1,
              opacity: 0.3,
              filter:
                theme.palette.mode === "dark"
                  ? "brightness(1.1)"
                  : "brightness(1.7)",
            }}
          />
        ) : null}
      </CardContent>
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
            <IconButton
              sx={{
                position: "absolute",
                top: theme.spacing(2),
                right: theme.spacing(2),
              }}
              onClick={() => setDetailShown(false)}
            >
              <ClearIcon />
            </IconButton>
            <TrialListDetail
              trial={trial}
              isBestTrial={() => false}
              directions={[]}
              objectiveNames={[]}
            />
          </Box>
        </Box>
      </Modal>
    </Card>
  )
}

const ChoiceTrials: FC<{
  choice: PreferenceHistory
  trials: Trial[]
  studyId: number
}> = ({ choice, trials, studyId }) => {
  const [isRemoved, setRemoved] = useState(choice.is_removed)
  const theme = useTheme()
  const worst_trials = new Set([choice.clicked])
  const action = actionCreator()

  return (
    <Box
      sx={{
        marginBottom: theme.spacing(4),
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: theme.typography.fontWeightLight,
            margin: "auto 0",
          }}
        >
          {formatDate(choice.timestamp)}
        </Typography>
        {choice.is_removed ? (
          <IconButton
            disabled={!isRemoved}
            onClick={() => {
              setRemoved(false)
              action.restorePreferentialHistory(studyId, choice.id)
            }}
            sx={{
              margin: `auto ${theme.spacing(2)}`,
            }}
          >
            <RestoreFromTrashIcon />
          </IconButton>
        ) : (
          <IconButton
            disabled={isRemoved}
            onClick={() => {
              setRemoved(true)
              action.removePreferentialHistory(studyId, choice.id)
            }}
            sx={{
              margin: `auto ${theme.spacing(2)}`,
            }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          filter: choice.is_removed ? "brightness(0.4)" : undefined,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {choice.candidates.map((trial_num, index) => (
          <CandidateTrial
            key={index}
            trial={trials[trial_num]}
            type={worst_trials.has(trial_num) ? "worst" : "none"}
          />
        ))}
      </Box>
    </Box>
  )
}

export const PreferenceHistory: FC<{ studyDetail: StudyDetail | null }> = ({
  studyDetail,
}) => {
  if (
    studyDetail === null ||
    !studyDetail.is_preferential ||
    studyDetail.preference_history === undefined
  ) {
    return null
  }
  const theme = useTheme()
  const preference_histories = [...studyDetail.preference_history]

  if (preference_histories.length === 0) {
    return (
      <Typography
        variant="h5"
        sx={{
          margin: theme.spacing(4),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        No feedback history
      </Typography>
    )
  }

  return (
    <Box
      padding={theme.spacing(2)}
      sx={{ display: "flex", flexDirection: "column" }}
    >
      {preference_histories.reverse().map((choice) => (
        <ChoiceTrials
          key={choice.id}
          choice={choice}
          trials={studyDetail.trials}
          studyId={studyDetail.id}
        />
      ))}
    </Box>
  )
}
