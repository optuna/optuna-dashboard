import React, { FC } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material"
import { Link } from "react-router-dom"
import LinkIcon from "@mui/icons-material/Link"

export const BestTrialsCard: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const theme = useTheme()

  let header = "Best Trials"
  let content: React.ReactNode = null
  if (studyDetail !== null && studyDetail.best_trials.length === 1) {
    const bestTrial = studyDetail.best_trials[0]
    header = `Best Trial (number=${bestTrial.number})`
    content = (
      <>
        <Typography
          variant="h3"
          sx={{ fontWeight: 600, marginBottom: theme.spacing(2) }}
          color="secondary"
        >
          {bestTrial.values}
        </Typography>
        <Typography>
          Params = [
          {bestTrial.params.map((p) => `${p.name}: ${p.value}`).join(", ")}]
        </Typography>
        <Typography>
          Intermediate Values = [
          {studyDetail.best_trials[0].intermediate_values
            .map((p) => `${p.step}: ${p.value}`)
            .join(", ")}
          ]
        </Typography>
        <Typography>
          User Attributes = [
          {studyDetail.best_trials[0].user_attrs
            .map((p) => `${p.key}: ${p.value}`)
            .join(", ")}
          ]
        </Typography>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          component={Link}
          to={`${URL_PREFIX}/studies/${bestTrial.study_id}/trials/${bestTrial.number}/`}
          sx={{ margin: theme.spacing(1) }}
        >
          Details
        </Button>
      </>
    )
  } else if (studyDetail !== null && studyDetail.best_trials.length > 1) {
    const bestTrials = studyDetail.best_trials
    content = (
      <>
        <Divider
          sx={{ paddingBottom: theme.spacing(1) }}
          orientation="horizontal"
        />
        <Box
          sx={{
            overflow: "auto",
            height: "450px",
            width: "100%",
          }}
        >
          <List>
            {bestTrials.map((trial) => (
              <ListItem key={trial.number} disablePadding>
                <ListItemButton
                  component={Link}
                  to={
                    URL_PREFIX +
                    `/studies/${trial.study_id}/trials/${trial.number}`
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="h5">Trial {trial.number}</Typography>
                    }
                    secondary={
                      <>
                        <Typography>
                          Objective Values = [{trial.values?.join(", ")}]
                        </Typography>
                        <Typography>
                          Params = [
                          {trial.params
                            .map((p) => `${p.name}: ${p.value}`)
                            .join(", ")}
                          ]
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </>
    )
  }
  return (
    <Card>
      <CardContent
        sx={{
          display: "inline-content",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" sx={{ margin: "1em 0", fontWeight: 600 }}>
          {header}
        </Typography>
        {content}
      </CardContent>
    </Card>
  )
}
