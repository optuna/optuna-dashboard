import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import { Box, CardMedia } from "@mui/material"
import { FC } from "react"
import { Artifact } from "ts/types/optuna"

export const ArtifactCardMedia: FC<{
  artifact: Artifact
  urlPath: string
  height: string
}> = ({ artifact, urlPath, height }) => {
  if (artifact.mimetype.startsWith("video")) {
    return (
      <Box
        component="div"
        style={{
          width: "100%",
          height: height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          controls
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <source src={urlPath} type={artifact.mimetype} />
        </video>
      </Box>
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
          justifyContent: "center",
        }}
      >
        <audio
          controls
          preload="metadata"
          style={{ width: "calc(100% - 16px)" }}
        >
          <source src={urlPath} type={artifact.mimetype} />
        </audio>
      </Box>
    )
  } else if (artifact.mimetype.startsWith("image")) {
    return (
      <Box
        component="div"
        style={{
          width: "100%",
          height: height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CardMedia
          component="img"
          image={urlPath}
          alt={artifact.filename}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </Box>
    )
  }
  return (
    <Box
      component="div"
      style={{
        width: "100%",
        height: height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <InsertDriveFileIcon sx={{ fontSize: 80 }} />
    </Box>
  )
}
