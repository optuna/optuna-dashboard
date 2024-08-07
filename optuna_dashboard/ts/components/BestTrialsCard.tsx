import LinkIcon from "@mui/icons-material/Link"
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
import React, { FC, ReactNode, useMemo } from "react"
import { Link } from "react-router-dom"
import { StudyDetail, Trial } from "ts/types/optuna"
import { useConstants } from "../constantsProvider"

const useBestTrials = (studyDetail: StudyDetail | null): Trial[] => {
  return useMemo(() => studyDetail?.best_trials || [], [studyDetail])
}

export const BestTrialsCard: FC<{
  studyDetail: StudyDetail | null
}> = ({ studyDetail }) => {
  const { URL_PREFIX } = useConstants()

  const theme = useTheme()
  const bestTrials = useBestTrials(studyDetail)

  let header = "Best Trials"
  let content: ReactNode = null
  if (bestTrials.length === 1) {
    const bestTrial = bestTrials[0]
    header = `Best Trial (number=${bestTrial.number})`
    content = (
      <>
        {!studyDetail?.is_preferential &&
          (bestTrial.values === undefined || bestTrial.values.length === 1 ? (
            <Typography
              variant="h3"
              sx={{
                fontWeight: theme.typography.fontWeightBold,
                marginBottom: theme.spacing(2),
              }}
              color="secondary"
            >
              {bestTrial.values}
            </Typography>
          ) : (
            <Typography>
              Objective Values = [{bestTrial.values?.join(", ")}]
            </Typography>
          ))}
        <Typography>
          Params = [
          {bestTrial.params
            .map((p) => `${p.name}: ${p.param_external_value}`)
            .join(", ")}
          ]
        </Typography>
        <Button
          variant="outlined"
          startIcon={<LinkIcon />}
          component={Link}
          to={`${URL_PREFIX}/studies/${bestTrial.study_id}/trials?numbers=${bestTrial.number}`}
          sx={{ margin: theme.spacing(1) }}
        >
          Details
        </Button>
      </>
    )
  } else if (bestTrials.length > 1) {
    content = (
      <>
        <Divider
          sx={{ paddingBottom: theme.spacing(1) }}
          orientation="horizontal"
        />
        <Box
          component="div"
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
                    `/studies/${trial.study_id}/trials?numbers=${trial.number}`
                  }
                  sx={{ flexDirection: "column", alignItems: "flex-start" }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h5">Trial {trial.number}</Typography>
                    }
                  />
                  {studyDetail?.is_preferential ? null : (
                    <Typography>
                      Objective Values = [{trial.values?.join(", ")}]
                    </Typography>
                  )}
                  <Typography>
                    Params = [
                    {trial.params
                      .map((p) => `${p.name}: ${p.param_external_value}`)
                      .join(", ")}
                    ]
                  </Typography>
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
        <Typography
          variant="h6"
          sx={{ margin: "1em 0", fontWeight: theme.typography.fontWeightBold }}
        >
          {header}
        </Typography>
        {content}
      </CardContent>
    </Card>
  )
}
