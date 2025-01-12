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

  const targetValueIndex = 0
  const targetArtifactIndex = 0

  const valueRanges = calculateMinMax(trials.map((trial) => trial.values))
  const direction =
    study.directions[targetValueIndex] === "maximize"
      ? "maximization"
      : "minimization"

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
          const artifact = trial.artifacts[targetArtifactIndex]
          const urlPath = `/artifacts/${trial.study_id}/${trial.trial_id}/${artifact.artifact_id}`

          const value = trial.values
            ? trial.values[targetValueIndex]
            : valueRanges.min[targetValueIndex]
          const borderValue = calculateBorderColor(
            value,
            valueRanges.min[0],
            valueRanges.max[0],
            direction
          )
          const border = `5px solid ${borderValue}`
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
                border: border,
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

type MinMaxResult = {
  min: number[]
  max: number[]
}

function calculateMinMax(values: (number[] | undefined)[]): MinMaxResult {
  if (values.length === 0) {
    return { min: [], max: [] }
  }

  const firstValidArray = values.find((arr) => arr !== undefined)
  if (!firstValidArray) {
    return { min: [], max: [] }
  }

  const length = firstValidArray.length
  const mins = new Array(length).fill(Infinity)
  const maxs = new Array(length).fill(-Infinity)

  values.forEach((arr) => {
    if (arr === undefined) return

    arr.forEach((value, index) => {
      if (index < length) {
        mins[index] = Math.min(mins[index], value)
        maxs[index] = Math.max(maxs[index], value)
      }
    })
  })

  const result: MinMaxResult = {
    min: mins.map((val) => (val === Infinity ? 0 : val)),
    max: maxs.map((val) => (val === -Infinity ? 0 : val)),
  }

  return result
}

type Direction = "minimization" | "maximization"

function calculateBorderColor(
  value: number,
  minValue: number,
  maxValue: number,
  direction: Direction = "minimization"
): string {
  if (minValue === maxValue) {
    return "rgb(255, 255, 255)"
  }

  let normalizedValue = (value - minValue) / (maxValue - minValue)
  if (direction === "maximization") {
    normalizedValue = 1 - normalizedValue
  }

  const red = Math.round(255 * normalizedValue)
  const green = Math.round(255 * normalizedValue)
  const blue = 255

  return `rgb(${red}, ${green}, ${blue})`
}
