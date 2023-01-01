import React, { FC, useState } from "react"
import {
  Typography,
  Box,
  Card,
  CardContent,
  useTheme,
  CardHeader,
} from "@mui/material"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemText from "@mui/material/ListItemText"
import ListSubheader from "@mui/material/ListSubheader"

import { TrialNote } from "./Note"

export const TrialList: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const theme = useTheme()
  const [selected, setSelected] = useState<number>(0)
  const trials: Trial[] = studyDetail !== null ? studyDetail.trials : []
  const trialListWidth = 240
  let content = null
  if (trials.length > selected) {
    const trial = trials[selected]
    content = (
      <>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardHeader title={`Trial ${trial.number}`} />
          <CardContent>
            <Typography>Trial Detail</Typography>
          </CardContent>
        </Card>
        <TrialNote
          studyId={trial.study_id}
          trialId={trial.trial_id}
          latestNote={trial.note}
        />
      </>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
      <Box
        sx={{
          width: trialListWidth,
          overflow: "auto",
          height: `calc(100vh - ${theme.spacing(8)})`,
        }}
      >
        <List>
          <ListSubheader>{`Running (${
            studyDetail?.trials.length || 0
          } Trials)`}</ListSubheader>
          <ListSubheader>{`Waiting (${
            studyDetail?.trials.length || 0
          } Trials)`}</ListSubheader>
          <ListSubheader>{`Completed (${
            studyDetail?.trials.length || 0
          } Trials)`}</ListSubheader>
          {trials.map((trial, i) => {
            let color: "primary" | "secondary" | "warning" = "primary"
            if (trial.state === "Complete") {
              color = "primary"
            } else if (trial.state === "Pruned") {
              color = "warning"
            }
            return (
              <ListItem key={trial.trial_id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setSelected(i)
                  }}
                  selected={i === selected}
                >
                  <ListItemText
                    primary={`Trial ${trial.trial_id}`}
                    secondary={
                      <>
                        <Chip color={color} label={trial.state} size="small" />
                        <Typography>State={trial.state}</Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
          <ListSubheader>{`Pruned (${
            studyDetail?.trials.length || 0
          } Trials)`}</ListSubheader>
          <ListSubheader>{`Failed (${
            studyDetail?.trials.length || 0
          } Trials)`}</ListSubheader>
        </List>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box sx={{ flexGrow: 1 }}>{content}</Box>
    </Box>
  )
}
