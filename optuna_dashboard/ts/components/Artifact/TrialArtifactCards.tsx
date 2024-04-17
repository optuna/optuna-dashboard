import React, {
  ChangeEventHandler,
  DragEventHandler,
  FC,
  MouseEventHandler,
  useRef,
  useState,
} from "react"
import {
  Typography,
  Box,
  useTheme,
  IconButton,
  Card,
  CardContent,
  CardActionArea,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import DeleteIcon from "@mui/icons-material/Delete"
import FullscreenIcon from "@mui/icons-material/Fullscreen"

import { actionCreator } from "../../action"
import { useDeleteTrialArtifactDialog } from "./DeleteArtifactDialog"
import {
  useThreejsArtifactModal,
  isThreejsArtifact,
} from "./ThreejsArtifactViewer"
import { ArtifactCardMedia } from "./ArtifactCardMedia"
import { Trial } from "ts/types"

export const TrialArtifactCards: FC<{ trial: Trial }> = ({ trial }) => {
  const theme = useTheme()
  const [openDeleteArtifactDialog, renderDeleteArtifactDialog] =
    useDeleteTrialArtifactDialog()
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()
  const isArtifactModifiable = (trial: Trial) => {
    return trial.state === "Running" || trial.state === "Waiting"
  }

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
        {trial.artifacts.map((artifact) => {
          const urlPath = `/artifacts/${trial.study_id}/${trial.trial_id}/${artifact.artifact_id}`
          return (
            <Card
              key={artifact.artifact_id}
              sx={{
                marginBottom: theme.spacing(2),
                width: width,
                margin: theme.spacing(0, 1, 1, 0),
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
                    wordWrap: "break-word",
                    maxWidth: `calc(100% - ${theme.spacing(
                      4 +
                        (isThreejsArtifact(artifact) ? 4 : 0) +
                        (isArtifactModifiable(trial) ? 4 : 0)
                    )})`,
                  }}
                >
                  {artifact.filename}
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
        {isArtifactModifiable(trial) ? (
          <TrialArtifactUploader trial={trial} width={width} height={height} />
        ) : null}
      </Box>
      {renderDeleteArtifactDialog()}
      {renderThreejsArtifactModal()}
    </>
  )
}

const TrialArtifactUploader: FC<{
  trial: Trial
  width: string
  height: string
}> = ({ trial, width, height }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [dragOver, setDragOver] = useState<boolean>(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const handleClick: MouseEventHandler = () => {
    if (!inputRef || !inputRef.current) {
      return
    }
    inputRef.current.click()
  }
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (files === null) {
      return
    }
    action.uploadTrialArtifact(trial.study_id, trial.trial_id, files[0])
  }
  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const files = e.dataTransfer.files
    setDragOver(false)
    for (let i = 0; i < files.length; i++) {
      action.uploadTrialArtifact(trial.study_id, trial.trial_id, files[i])
    }
  }
  const handleDragOver: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOver(true)
  }
  const handleDragLeave: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOver(false)
  }
  return (
    <Card
      sx={{
        marginBottom: theme.spacing(2),
        width: width,
        minHeight: height,
        margin: theme.spacing(0, 1, 1, 0),
        border: dragOver
          ? `3px dashed ${theme.palette.mode === "dark" ? "white" : "black"}`
          : `1px solid ${theme.palette.divider}`,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardActionArea
        onClick={handleClick}
        sx={{
          height: "100%",
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <UploadFileIcon
            sx={{ fontSize: 80, marginBottom: theme.spacing(2) }}
          />
          <input
            type="file"
            ref={inputRef}
            onChange={handleOnChange}
            style={{ display: "none" }}
          />
          <Typography>Upload a New File</Typography>
          <Typography
            sx={{ textAlign: "center", color: theme.palette.grey.A400 }}
          >
            Drag your file here or click to browse.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
