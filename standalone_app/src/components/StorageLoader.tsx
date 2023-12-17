import React, {
  ChangeEvent,
  DragEventHandler,
  FC,
  MouseEventHandler,
  useRef,
  useState,
} from "react"
import { loadSQLite3Storage } from "../sqlite3"
import { loadJournalStorage } from "../journalStorage"
import { useSetRecoilState } from "recoil"
import { studiesState } from "../state"
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"

export const StorageLoader: FC = () => {
  const theme = useTheme()
  const [dragOver, setDragOver] = useState<boolean>(false)

  const setStudies = useSetRecoilState<Study[]>(studiesState)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadStorageFromFile = (file: File): void => {
    const r = new FileReader()
    r.addEventListener("load", () => {
      const arrayBuffer = r.result as ArrayBuffer | null
      const fileExtension = file.name.split(".").pop()
      if (arrayBuffer !== null) {
        if (fileExtension === "log") {
          loadJournalStorage(arrayBuffer, setStudies)
        } else {
          loadSQLite3Storage(arrayBuffer, setStudies)
        }
      }
    })
    r.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) {
      return
    }
    loadStorageFromFile(f)
  }
  const handleClick: MouseEventHandler = () => {
    if (!inputRef || !inputRef.current) {
      return
    }
    inputRef.current.click()
  }
  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    setDragOver(false)
    if (!file) {
      return
    }
    loadStorageFromFile(file)
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

  return (
    <Card
      sx={{
        margin: theme.spacing(2),
        border: dragOver
          ? `3px dashed ${theme.palette.mode === "dark" ? "white" : "black"}`
          : `1px solid ${theme.palette.divider}`,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardActionArea onClick={handleClick}>
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
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <Typography>Load an Optuna Storage</Typography>
          <Typography
            sx={{ textAlign: "center", color: theme.palette.grey.A400 }}
          >
            Drag your SQLite3/JournalStorage file here or click to browse.
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
