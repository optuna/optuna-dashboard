import React, { useCallback, useEffect, useState, useRef } from "react"
import WaveSurfer from "wavesurfer.js"
import { Box } from "@mui/material"

interface WaveSurferArtifactViewerProps {
  height: number
  waveColor: string
  progressColor: string
  url: string
}

// WaveSurfer hook
const useWavesurfer = (
  containerRef: React.MutableRefObject<HTMLDivElement>,
  options: WaveSurferArtifactViewerProps
) => {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      ...options,
      container: containerRef.current,
    })

    setWavesurfer(ws)

    return () => {
      ws.destroy()
    }
  }, [options, containerRef])

  return wavesurfer
}

// Create a React component that will render wavesurfer.
// Props are wavesurfer options.
export const WaveSurferArtifactViewer: React.FC<
  WaveSurferArtifactViewerProps
> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const wavesurfer = useWavesurfer(containerRef, props)

  // On play button click
  const onPlayClick = useCallback(() => {
    if (!wavesurfer) return
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play()
  }, [wavesurfer])

  // Initialize wavesurfer when the container mounts
  // or any of the props change
  useEffect(() => {
    if (!wavesurfer) return

    setIsPlaying(false)

    const subscriptions = [
      wavesurfer.on("play", () => setIsPlaying(true)),
      wavesurfer.on("pause", () => setIsPlaying(false)),
    ]

    return () => {
      subscriptions.forEach((unsub) => unsub())
    }
  }, [wavesurfer])

  return (
    <Box style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <div ref={containerRef} style={{ minHeight: "120px", width: "100%" }} />
      <button onClick={onPlayClick} style={{ marginTop: "1em" }}>
        {isPlaying ? "Pause" : "Play"}
      </button>
    </Box>
  )
}
