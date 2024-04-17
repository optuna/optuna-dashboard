import React, { FC } from "react"
import {
  ThreejsArtifactViewer,
  isThreejsArtifact,
} from "./ThreejsArtifactViewer"
import { WaveSurferArtifactViewer } from "./WaveSurferArtifactViewer"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { CardMedia, Box } from "@mui/material"
import { Artifact } from "ts/types/optuna"

export const ArtifactCardMedia: FC<{
  artifact: Artifact
  urlPath: string
  height: string
}> = ({ artifact, urlPath, height }) => {
  if (isThreejsArtifact(artifact)) {
    return (
      <ThreejsArtifactViewer
        src={urlPath}
        width={"100%"}
        height={height}
        hasGizmo={false}
        filetype={artifact.filename.split(".").pop()}
      />
    )
  } else if (artifact.mimetype.startsWith("video")) {
    return (
      <video
        controls
        style={{
          width: "100%",
          height: "auto",
        }}
      >
        <source src={urlPath} type={artifact.mimetype} />
      </video>
    )
  } else if (artifact.mimetype.startsWith("audio")) {
    return (
      <Box
        component="div"
        style={{
          width: "100%",
          height: height,
          display: "flex",
          alignItems: "center",
        }}
      >
        <WaveSurferArtifactViewer
          height={100}
          waveColor="rgb(200, 0, 200)"
          progressColor="rgb(100, 0, 100)"
          url={urlPath}
        />
      </Box>
    )
  } else if (artifact.mimetype.startsWith("image")) {
    return (
      <CardMedia
        component="img"
        height={height}
        image={urlPath}
        alt={artifact.filename}
        style={{
          objectFit: "contain",
        }}
      />
    )
  }
  return <InsertDriveFileIcon sx={{ fontSize: 80 }} />
}
