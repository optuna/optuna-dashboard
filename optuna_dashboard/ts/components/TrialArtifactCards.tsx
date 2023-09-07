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
  CardMedia,
  CardActionArea,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import DeleteIcon from "@mui/icons-material/Delete"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"

import { actionCreator } from "../action"
import { useDeleteArtifactDialog } from "./DeleteArtifactDialog"
import {
  ThreejsArtifactViewer,
  useThreejsArtifactModal,
} from "./ThreejsArtifactViewer"

export const TrialArtifactCards: FC<{ trial: Trial }> = ({ trial }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [openDeleteArtifactDialog, renderDeleteArtifactDialog] =
    useDeleteArtifactDialog()
  const [dragOver, setDragOver] = useState<boolean>(false)
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()

  const width = "200px"
  const height = "150px"

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
    action.uploadArtifact(trial.study_id, trial.trial_id, files[0])
  }
  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const files = e.dataTransfer.files
    setDragOver(false)
    for (let i = 0; i < files.length; i++) {
      action.uploadArtifact(trial.study_id, trial.trial_id, files[i])
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
    <>
      <Typography
        variant="h5"
        sx={{ fontWeight: theme.typography.fontWeightBold }}
      >
        Artifacts
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", p: theme.spacing(1, 0) }}>
        {trial.artifacts.map((a) => {
          const artifactUrlPath = `/artifacts/${trial.study_id}/${trial.trial_id}/${a.artifact_id}`
          if (a.mimetype.startsWith("image")) {
            return (
              <Card
                key={a.artifact_id}
                sx={{
                  marginBottom: theme.spacing(2),
                  width: width,
                  margin: theme.spacing(0, 1, 1, 0),
                }}
              >
                <CardMedia
                  component="img"
                  height={height}
                  image={artifactUrlPath}
                  alt={a.filename}
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
                      maxWidth: `calc(100% - ${theme.spacing(8)})`,
                    }}
                  >
                    {a.filename}
                  </Typography>
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        trial.study_id,
                        trial.trial_id,
                        a
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    aria-label="download artifact"
                    size="small"
                    color="inherit"
                    download={a.filename}
                    sx={{ margin: "auto 0" }}
                    href={artifactUrlPath}
                  >
                    <DownloadIcon />
                  </IconButton>
                </CardContent>
              </Card>
            )
          } else if (
            a.filename.endsWith(".stl") ||
            a.filename.endsWith(".3dm")
          ) {
            return (
              <Card
                key={a.artifact_id}
                sx={{
                  marginBottom: theme.spacing(2),
                  display: "flex",
                  flexDirection: "column",
                  width: width,
                  minHeight: "100%",
                  margin: theme.spacing(0, 1, 1, 0),
                }}
              >
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ThreejsArtifactViewer
                    src={artifactUrlPath}
                    width={width}
                    height={height}
                    hasGizmo={false}
                    filetype={a.filename.split(".").pop()}
                  />
                </Box>
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
                      maxWidth: `calc(100% - ${theme.spacing(12)})`,
                    }}
                  >
                    {a.filename}
                  </Typography>
                  <IconButton
                    aria-label="show artifact 3d model"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openThreejsArtifactModal(artifactUrlPath, a)
                    }}
                  >
                    <FullscreenIcon />
                  </IconButton>
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        trial.study_id,
                        trial.trial_id,
                        a
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    aria-label="download artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    download={a.filename}
                    href={artifactUrlPath}
                  >
                    <DownloadIcon />
                  </IconButton>
                </CardContent>
              </Card>
            )
          } else if (a.mimetype.startsWith("audio")) {
            return (
              <Card
                key={a.artifact_id}
                sx={{
                  marginBottom: theme.spacing(2),
                  display: "flex",
                  flexDirection: "column",
                  width: width,
                  minHeight: "100%",
                  margin: theme.spacing(0, 1, 1, 0),
                }}
              >
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <audio controls>
                    <source src={artifactUrlPath} type={a.mimetype} />
                  </audio>
                </Box>
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
                      maxWidth: `calc(100% - ${theme.spacing(8)})`,
                    }}
                  >
                    {a.filename}
                  </Typography>
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        trial.study_id,
                        trial.trial_id,
                        a
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    aria-label="download artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    download={a.filename}
                    href={artifactUrlPath}
                  >
                    <DownloadIcon />
                  </IconButton>
                </CardContent>
              </Card>
            )
          } else {
            return (
              <Card
                key={a.artifact_id}
                sx={{
                  marginBottom: theme.spacing(2),
                  display: "flex",
                  flexDirection: "column",
                  width: width,
                  minHeight: "100%",
                  margin: theme.spacing(0, 1, 1, 0),
                }}
              >
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <InsertDriveFileIcon sx={{ fontSize: 80 }} />
                </Box>
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
                      maxWidth: `calc(100% - ${theme.spacing(8)})`,
                    }}
                  >
                    {a.filename}
                  </Typography>
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        trial.study_id,
                        trial.trial_id,
                        a
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    aria-label="download artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    download={a.filename}
                    href={artifactUrlPath}
                  >
                    <DownloadIcon />
                  </IconButton>
                </CardContent>
              </Card>
            )
          }
        })}
        {trial.state === "Running" || trial.state === "Waiting" ? (
          <Card
            sx={{
              marginBottom: theme.spacing(2),
              width: width,
              minHeight: height,
              margin: theme.spacing(0, 1, 1, 0),
              border: dragOver
                ? `3px dashed ${
                    theme.palette.mode === "dark" ? "white" : "black"
                  }`
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
        ) : null}
      </Box>
      {renderDeleteArtifactDialog()}
      {renderThreejsArtifactModal()}
    </>
  )
}
