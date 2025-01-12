import DeleteIcon from "@mui/icons-material/Delete"
import DownloadIcon from "@mui/icons-material/Download"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material"
import React, { FC } from "react"

import { StudyDetail, Trial } from "ts/types/optuna"
import { ArtifactCardMedia } from "./ArtifactCardMedia"
import { useDeleteTrialArtifactDialog } from "./DeleteArtifactDialog"
import { isTableArtifact, useTableArtifactModal } from "./TableArtifactViewer"
import {
  isThreejsArtifact,
  useThreejsArtifactModal,
} from "./ThreejsArtifactViewer"

export const SelectedTrialArtifactCards: FC<{
  study: StudyDetail
  selectedTrials: number[]
}> = ({ study, selectedTrials }) => {
  const theme = useTheme()
  const [openDeleteArtifactDialog, renderDeleteArtifactDialog] =
    useDeleteTrialArtifactDialog()
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()
  const [openTableArtifactModal, renderTableArtifactModal] =
    useTableArtifactModal()
  const isArtifactModifiable = (trial: Trial) => {
    return trial.state === "Running" || trial.state === "Waiting"
  }

  if (selectedTrials.length === 0) {
    selectedTrials = study.trials.map((trial) => trial.number)
  }

  const trials = study.trials.filter((trial) =>
    selectedTrials.includes(trial.number)
  )
  const width = "200px"
  const height = "150px"

  return (
    <>
      <Typography
        variant="h5"
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        Artifacts
      </Typography>
      <Box
        component="div"
        sx={{ display: "flex", flexWrap: "wrap", p: theme.spacing(1, 0) }}
      >
        {trials.map((trial) => {
          const artifact = trial.artifacts[0]
          const urlPath = `/artifacts/${trial.study_id}/${trial.trial_id}/${artifact.artifact_id}`
          return (
            <Card
              key={artifact.artifact_id}
              sx={{
                marginBottom: theme.spacing(2),
                width: width,
                margin: theme.spacing(0, 1, 1, 0),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <ArtifactCardMedia
                artifact={artifact}
                urlPath={urlPath}
                height={height}
              />
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  padding: `${theme.spacing(1)} !important`,
                }}
              >
                <Typography
                  sx={{
                    p: theme.spacing(0.5, 0),
                    flexGrow: 1,
                    wordBreak: "break-all",
                    maxWidth: `calc(100% - ${theme.spacing(
                      4 +
                        (isThreejsArtifact(artifact) ? 4 : 0) +
                        (isArtifactModifiable(trial) ? 4 : 0)
                    )})`,
                  }}
                >
                  {"Trial id: " + trial.number}
                </Typography>
                {isThreejsArtifact(artifact) ? (
                  <IconButton
                    aria-label="show artifact 3d model"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openThreejsArtifactModal(urlPath, artifact)
                    }}
                  >
                    <FullscreenIcon />
                  </IconButton>
                ) : null}
                {isTableArtifact(artifact) ? (
                  <IconButton
                    aria-label="show artifact table"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openTableArtifactModal(urlPath, artifact)
                    }}
                  >
                    <FullscreenIcon />
                  </IconButton>
                ) : null}
                {isArtifactModifiable(trial) ? (
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        trial.study_id,
                        trial.trial_id,
                        artifact
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                ) : null}
                <IconButton
                  aria-label="download artifact"
                  size="small"
                  color="inherit"
                  download={artifact.filename}
                  sx={{ margin: "auto 0" }}
                  href={urlPath}
                >
                  <DownloadIcon />
                </IconButton>
              </CardContent>
            </Card>
          )
        })}
      </Box>
      {renderDeleteArtifactDialog()}
      {renderThreejsArtifactModal()}
      {renderTableArtifactModal()}
    </>
  )
}
