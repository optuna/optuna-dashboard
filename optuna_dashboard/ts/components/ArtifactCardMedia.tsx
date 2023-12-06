import React, { FC } from "react"
import {
  ThreejsArtifactViewer,
  isThreejsArtifact,
} from "./ThreejsArtifactViewer"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { CardMedia, Box } from "@mui/material"

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
        style={{
          width: "100%",
          height: height,
          display: "flex",
          alignItems: "center",
        }}
      >
        <audio controls style={{ width: "100%" }}>
          <source src={urlPath} type={artifact.mimetype} />
        </audio>
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
