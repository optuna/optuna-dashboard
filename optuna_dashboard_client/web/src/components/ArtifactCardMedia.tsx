import React, { FC } from "react"
import {
  ThreejsArtifactViewer,
  isThreejsArtifact,
} from "./ThreejsArtifactViewer"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { CardMedia } from "@mui/material"

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
        style={{
          objectFit: "contain",
        }}
      />
    )
  }
  return <InsertDriveFileIcon sx={{ fontSize: 80 }} />
}
