import DeleteIcon from "@mui/icons-material/Delete"
import DownloadIcon from "@mui/icons-material/Download"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material"
import React, {
  ChangeEventHandler,
  DragEventHandler,
  FC,
  MouseEventHandler,
  useRef,
  useState,
} from "react"

import { StudyDetail } from "ts/types/optuna"
import { actionCreator } from "../../action"
import { ArtifactCardMedia } from "./ArtifactCardMedia"
import { useDeleteStudyArtifactDialog } from "./DeleteArtifactDialog"
import {
  isThreejsArtifact,
  useThreejsArtifactModal,
} from "./ThreejsArtifactViewer"

export const StudyArtifactCards: FC<{ study: StudyDetail }> = ({ study }) => {
  const theme = useTheme()
  const [openDeleteArtifactDialog, renderDeleteArtifactDialog] =
    useDeleteStudyArtifactDialog()
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()

  const width = "200px"
  const height = "150px"

  return (
    <>
      <Box
        component="div"
        sx={{ display: "flex", flexWrap: "wrap", p: theme.spacing(1, 0) }}
      >
        {study.artifacts.map((artifact) => {
          const urlPath = `/artifacts/${study.id}/${artifact.artifact_id}`
          return (
            <Card
              key={artifact.artifact_id}
              sx={{
                marginBottom: theme.spacing(2),
                width: width,
                margin: theme.spacing(0, 1, 1, 0),
                border: `1px solid ${theme.palette.divider}`,
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
                    maxWidth: `calc(100% - ${
                      isThreejsArtifact(artifact)
                        ? theme.spacing(12)
                        : theme.spacing(8)
                    })`,
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
                <IconButton
                  aria-label="delete artifact"
                  size="small"
                  color="inherit"
                  sx={{ margin: "auto 0" }}
                  onClick={() => {
                    openDeleteArtifactDialog(study.id, artifact)
                  }}
                >
                  <DeleteIcon />
                </IconButton>
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
        <StudyArtifactUploader study={study} width={width} height={height} />
      </Box>
      {renderDeleteArtifactDialog()}
      {renderThreejsArtifactModal()}
    </>
  )
}

const StudyArtifactUploader: FC<{
  study: StudyDetail
  width: string
  height: string
}> = ({ study, width, height }) => {
  const theme = useTheme()
  const [dragOver, setDragOver] = useState<boolean>(false)
  const action = actionCreator()

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
    action.uploadStudyArtifact(study.id, files[0])
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

  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const files = e.dataTransfer.files
    setDragOver(false)
    for (let i = 0; i < files.length; i++) {
      action.uploadStudyArtifact(study.id, files[i])
    }
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
