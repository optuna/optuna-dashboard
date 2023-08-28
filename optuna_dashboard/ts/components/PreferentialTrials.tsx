import React, { FC, useState } from "react"
import { Typography, Box, Button, useTheme } from "@mui/material"

import { TrialNote } from "./Note"
import { actionCreator } from "../action"

const PreferentialTrial: FC<{
  trial?: Trial
  studyDetail: StudyDetail
  hideTrial: () => void
}> = ({ trial, studyDetail, hideTrial }) => {
  const theme = useTheme()
  const action = actionCreator()
  const trialWidth = 500

  if (trial == undefined) {
    return <Box width={trialWidth}></Box>
  }

  return (
    <Box sx={{ width: trialWidth, padding: theme.spacing(2, 2, 0, 2) }}>
      <Typography
        variant="h4"
        sx={{
          marginBottom: theme.spacing(2),
          fontWeight: theme.typography.fontWeightBold,
        }}
      >
        Trial {trial.number} (trial_id={trial.trial_id})
      </Typography>
      <Button
        variant="outlined"
        onClick={() => {
          hideTrial()
          action.skipPreferentialTrial(trial.study_id, trial.trial_id)
        }}
      >
        Reload
      </Button>
      <Button
        variant="outlined"
        onClick={() => {
          hideTrial()
          const best_trials = studyDetail.best_trials
            .map((t) => t.number)
            .filter((t) => t !== trial.number)
          action.updatePreference(trial.study_id, best_trials, [trial.number])
        }}
      >
        Worst
      </Button>
      <TrialNote
        studyId={trial.study_id}
        trialId={trial.trial_id}
        latestNote={trial.note}
        cardSx={{ marginBottom: theme.spacing(2) }}
      />
    </Box>
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
  )
}
