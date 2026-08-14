import UploadFileIcon from "@mui/icons-material/UploadFile"
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material"
import {
  ChangeEvent,
  DragEventHandler,
  FC,
  MouseEventHandler,
  useContext,
  useRef,
  useState,
} from "react"
import { StorageContext } from "./StorageProvider"

export const StorageLoader: FC = () => {
  const theme = useTheme()
  const [dragOver, setDragOver] = useState<boolean>(false)
  const { loadStorage, loading, error } = useContext(StorageContext)

  const inputRef = useRef<HTMLInputElement>(null)

  const loadStorageFromFile = async (file: File): Promise<void> => {
    await loadStorage(await file.arrayBuffer(), { name: file.name })
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (loading) {
      return
    }
    const f = e.target.files?.[0]
    if (!f) {
      return
    }
    void loadStorageFromFile(f)
  }
  const handleClick: MouseEventHandler = () => {
    if (loading) {
      return
    }
    if (!inputRef || !inputRef.current) {
      return
    }
    inputRef.current.click()
  }
  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) {
      return
    }
    const file = e.dataTransfer.files?.[0]
    setDragOver(false)
    if (!file) {
      return
    }
    void loadStorageFromFile(file)
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
      <CardActionArea onClick={handleClick} disabled={loading}>
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
          <Typography>
            {loading ? "Loading an Optuna Storage" : "Load an Optuna Storage"}
          </Typography>
          <Typography
            sx={{ textAlign: "center", color: theme.palette.grey.A400 }}
          >
            Drag your SQLite3/JournalStorage file here or click to browse.
          </Typography>
          {error !== null && (
            <Typography color="error">{error.message}</Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
