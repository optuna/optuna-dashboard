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
import Modal from "@mui/material/Modal"

import { TrialNote } from "./Note"
import { actionCreator } from "../action"
import { TrialListDetail } from "./TrialList"

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

  if (trial == undefined) {
    return (
      <Box
        sx={{
          width: trialWidth,
          minHeight: trialHeight,
        }}
      />
    )
  }

  return (
    <Card
      sx={{
        width: trialWidth,
        minHeight: trialHeight,
        position: "relative",
        margin: theme.spacing(2),
        padding: 0,
      }}
    >
      <CardActions>
        <IconButton
          sx={{
            marginLeft: "auto",
            zIndex: 2,
          }}
          onClick={() => setDetailShown(true)}
          aria-label="show detail"
        >
          <OpenInFullIcon />
        </IconButton>
      </CardActions>
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
          "::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: theme.palette.mode === "dark" ? "white" : "black",
            opacity: 0,
            zIndex: 1,
            transition: "opacity 0.3s ease-out",
          },
          ":hover::before": {
            opacity: 0.1,
          },
        }}
      >
        <Box
          sx={{
            padding: theme.spacing(2, 2, 0, 2),
            position: "relative",
          }}
        >
          <TrialNote
            studyId={trial.study_id}
            trialId={trial.trial_id}
            latestNote={trial.note}
            cardSx={{ marginBottom: theme.spacing(2) }}
            editable={false}
          />
        </Box>

        <ClearIcon
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            color: "red",
            fontSize: trialWidth / 2,
            opacity: 0,
            transition: "opacity 0.3s ease-out",
            zIndex: 1,
            ":hover": {
              opacity: 0.5,
            },
          }}
        />
      </CardContent>
      <Modal open={detailShown} onClose={() => setDetailShown(false)}>
        <Box
          sx={{
            position: "absolute",
            width: "70%",
            left: "15%",
            top: theme.spacing(8),
            backgroundColor: theme.palette.mode === "dark" ? "black" : "white",
            borderRadius: theme.spacing(3),
          }}
        >
          <TrialListDetail
            trial={trial}
            isBestTrial={() => false}
            directions={[]}
            objectiveNames={[]}
          />
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
    <Box padding={theme.spacing(2)}>
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
    </Box>
  )
}
