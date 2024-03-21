import React, { FC, useMemo } from "react"
import { ArtifactCardMedia } from "../Artifact/ArtifactCardMedia"
import { MarkdownRenderer } from "../Note"

export const PreferentialOutputComponent: FC<{
  trial: Trial
  artifact?: Artifact
  componentType: FeedbackComponentType
  urlPath: string
}> = ({ trial, artifact, componentType, urlPath }) => {
  const note = useMemo(() => {
    return <MarkdownRenderer body={trial.note.body} />
  }, [trial.note.body])
  if (componentType === undefined || componentType.output_type === "note") {
    return note
  }
  if (componentType.output_type === "artifact") {
    if (artifact === undefined) {
      return null
    }
    return (
      <ArtifactCardMedia artifact={artifact} urlPath={urlPath} height="100%" />
    )
  }
  return null
}
