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
import { actionCreator } from "../../action"
import { StudyDetail, Trial } from "../../types/optuna"
import { ArtifactCardMedia } from "./ArtifactCardMedia"
import { useDeleteArtifactDialog } from "./DeleteArtifactDialog"
import { isTableArtifact, useTableArtifactModal } from "./TableArtifactViewer"
import {
  isThreejsArtifact,
  useThreejsArtifactModal,
} from "./ThreejsArtifactViewer"

type StudyOrTrial =
  | {
      type: "study"
      study: StudyDetail
    }
  | {
      type: "trial"
      trial: Trial
    }
export const ArtifactCards: FC<{
  studyOrTrial: StudyOrTrial
  isArtifactModifiable?: boolean
}> = ({ studyOrTrial, isArtifactModifiable = true }) => {
  const theme = useTheme()
  const [openDeleteArtifactDialog, renderDeleteArtifactDialog] =
    useDeleteArtifactDialog()
  const [openThreejsArtifactModal, renderThreejsArtifactModal] =
    useThreejsArtifactModal()
  const [openTableArtifactModal, renderTableArtifactModal] =
    useTableArtifactModal()

  const width = "200px"
  const height = "150px"
  const sortedArtifacts = [
    ...(studyOrTrial.type === "study"
      ? studyOrTrial.study.artifacts
      : studyOrTrial.trial.artifacts),
  ].sort((a, b) => {
    if (a.filename < b.filename) {
      return -1
    } else if (a.filename > b.filename) {
      return 1
    } else {
      return 0
    }
  })

  return (
    <>
      <Box
        component="div"
        sx={{ display: "flex", flexWrap: "wrap", p: theme.spacing(1, 0) }}
      >
        {sortedArtifacts.map((artifact) => {
          const urlPath =
            studyOrTrial.type === "study"
              ? `/artifacts/${studyOrTrial.study.id}/${artifact.artifact_id}`
              : `/artifacts/${studyOrTrial.trial.study_id}/${studyOrTrial.trial.trial_id}/${artifact.artifact_id}`
          return (
            <Card
              key={artifact.artifact_id}
              sx={{
                marginBottom: theme.spacing(2),
                width: width,
                margin: theme.spacing(0, 1, 1, 0),
                display: studyOrTrial.type === "trial" ? "flex" : undefined,
                flexDirection:
                  studyOrTrial.type === "trial" ? "column" : undefined,
                alignItems:
                  studyOrTrial.type === "trial" ? "center" : undefined,
                border:
                  studyOrTrial.type === "study"
                    ? `1px solid ${theme.palette.divider}`
                    : undefined,
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
                    wordBreak:
                      studyOrTrial.type === "trial" ? "break-all" : undefined,
                    maxWidth:
                      studyOrTrial.type === "trial"
                        ? `calc(100% - ${theme.spacing(
                            4 +
                              (isThreejsArtifact(artifact) ? 4 : 0) +
                              (isArtifactModifiable ? 4 : 0)
                          )})`
                        : `calc(100% - ${
                            isThreejsArtifact(artifact)
                              ? theme.spacing(12)
                              : theme.spacing(8)
                          })`,
                    wordWrap:
                      studyOrTrial.type === "study" ? "break-word" : undefined,
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
                {isArtifactModifiable && (
                  <IconButton
                    aria-label="delete artifact"
                    size="small"
                    color="inherit"
                    sx={{ margin: "auto 0" }}
                    onClick={() => {
                      openDeleteArtifactDialog(
                        studyOrTrial.type === "study"
                          ? {
                              type: "study",
                              studyId: studyOrTrial.study.id,
                              artifact,
                            }
                          : {
                              type: "trial",
                              studyId: studyOrTrial.trial.study_id,
                              trialId: studyOrTrial.trial.trial_id,
                              artifact,
                            }
                      )
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
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
        {isArtifactModifiable && (
          <ArtifactUploader
            studyOrTrial={studyOrTrial}
            width={width}
            height={height}
          />
        )}
      </Box>
      {renderDeleteArtifactDialog()}
      {renderThreejsArtifactModal()}
      {renderTableArtifactModal()}
    </>
  )
}

const ArtifactUploader: FC<{
  studyOrTrial: StudyOrTrial
  width: string
  height: string
}> = ({ studyOrTrial, width, height }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [dragOver, setDragOver] = useState(false)

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
    if (studyOrTrial.type === "study") {
      action.uploadStudyArtifact(studyOrTrial.study.id, files[0])
    } else if (studyOrTrial.type === "trial") {
      action.uploadTrialArtifact(
        studyOrTrial.trial.study_id,
        studyOrTrial.trial.trial_id,
        files[0]
      )
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

  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const files = e.dataTransfer.files
    setDragOver(false)
    for (let i = 0; i < files.length; i++) {
      if (studyOrTrial.type === "study") {
        action.uploadStudyArtifact(studyOrTrial.study.id, files[i])
      } else if (studyOrTrial.type === "trial") {
        action.uploadTrialArtifact(
          studyOrTrial.trial.study_id,
          studyOrTrial.trial.trial_id,
          files[i]
        )
      }
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
