import React, { useEffect } from "react"
import { Stage } from "ngl"
import { v4 as uuidv4 } from "uuid"

interface AtomsArtifactViewerProps {
  src: string
  width: string
  height: string
  filetype: string | undefined
}

export const AtomsArtifactViewer: React.FC<AtomsArtifactViewerProps> = (
  props
) => {
  const viewport_id = uuidv4()
  useEffect(() => {
    const stage = new Stage(viewport_id, { backgroundColor: "white" })

    // read the content of props.src
    const reader = new FileReader()
    reader.onload = function (e) {
      const data = e.target?.result
      if (typeof data === "string") {
        stage
          .loadFile(data, { ext: props.filetype, defaultRepresentation: false })
          .then(function (o) {
            o.addRepresentation("ball+stick")
            o.addRepresentation("spacefill", { radiusScale: 0.5 }) //TODO: add cylinder
            o.addRepresentation("unitcell")
            o.autoView()
          })
      }
    }
    const blob = new Blob([props.src], { type: "text/plain" })
    reader.readAsText(blob)
  }, [])
  return (
    <div
      id={viewport_id}
      style={{ width: props.width, height: props.height }}
    ></div>
  )
}
