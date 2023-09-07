import React, { FC } from "react"
import { ThreejsArtifactViewer } from "./ThreejsArtifactViewer"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { CardMedia } from "@mui/material"

export const ArtifactCardMedia: FC<{
  artifact: Artifact
  urlPath: string
  height: string
}> = ({ artifact, urlPath, height }) => {
  if (
    artifact.filename.endsWith(".stl") ||
    artifact.filename.endsWith(".3dm")
  ) {
    return (
      <ThreejsArtifactViewer
        src={urlPath}
        width={"100%"}
        height={height}
        hasGizmo={false}
        filetype={artifact.filename.split(".").pop()}
      />
    )
  } else if (artifact.mimetype.startsWith("audio")) {
    return (
      <audio controls>
        <source src={urlPath} type={artifact.mimetype} />
      </audio>
    )
  } else if (artifact.mimetype.startsWith("image")) {
    return (
      <CardMedia
        component="img"
        height={height}
        image={urlPath}
        alt={artifact.filename}
      />
    )
  }
  return <InsertDriveFileIcon sx={{ fontSize: 80 }} />
}
