import React, { FC } from "react"
import {
  ThreejsArtifactViewer,
  isThreejsArtifact,
} from "./ThreejsArtifactViewer"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { CardMedia } from "@mui/material"
import { AtomsArtifactViewer } from "./AtomsArtifactViewer"

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
  } else if (
    artifact.mimetype === "chemical/x-pdb" ||
    artifact.mimetype === "chemical/x-mol2" ||
    artifact.mimetype === "chemical/x-mdl-sdfile" ||
    artifact.filename.endsWith(".pdb")
  ) {
    return (
      <AtomsArtifactViewer
        artifactId={artifact.artifact_id}
        src={urlPath}
        width={"100%"}
        height={height}
        filetype={artifact.filename.split(".").pop()}
      />
    )
  }
  return <InsertDriveFileIcon sx={{ fontSize: 80 }} />
}
