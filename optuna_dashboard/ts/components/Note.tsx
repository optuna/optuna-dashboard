import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import HtmlIcon from "@mui/icons-material/Html"
import ModeEditIcon from "@mui/icons-material/ModeEdit"
import SaveIcon from "@mui/icons-material/Save"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import LoadingButton from "@mui/lab/LoadingButton"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  SxProps,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import { Theme } from "@mui/material/styles"
import React, {
  FC,
  createRef,
  useState,
  useEffect,
  DragEventHandler,
  useRef,
  MouseEventHandler,
  ChangeEventHandler,
} from "react"
import ReactMarkdown from "react-markdown"
import {
  CodeComponent,
  ReactMarkdownNames,
  // @ts-ignore
} from "react-markdown/lib/ast-to-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism"
// @ts-ignore
import rehypeMathjax from "rehype-mathjax"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { useAtomValue } from "jotai"
import { Note } from "ts/types/optuna"
import { actionCreator } from "../action"
import { artifactIsAvailable, isFileUploading, useArtifacts } from "../state"

const placeholder = `## What is this feature for?

Here you can freely take a note in *(GitHub flavored) Markdown format*.
In addition, **code blocks with syntax highlights** and **formula** are also supported here, as shown below.

### Code-block with Syntax Highlights

\`\`\`python
def objective(trial):
    x = trial.suggest_float("x", -10, 10)
    y = trial.suggest_float("y", -10, 10)
    return (x - 5) ** 2 + (y + 5) ** 2
\`\`\`

### Formula

$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$
`

const CodeBlock: CodeComponent | ReactMarkdownNames = ({
  // @ts-ignore
  inline,
  // @ts-ignore
  className,
  // @ts-ignore
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || "")
  return !inline && match ? (
    <SyntaxHighlighter
      style={darcula}
      language={match[1]}
      PreTag="div"
      {...props}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

export const TrialNote: FC<{
  studyId: number
  trialId: number
  latestNote: Note
  cardSx?: SxProps<Theme>
}> = ({ studyId, trialId, latestNote, cardSx }) => {
  return (
    <NoteBase
      studyId={studyId}
      trialId={trialId}
      latestNote={latestNote}
      cardSx={cardSx}
    />
  )
}

export const StudyNote: FC<{
  studyId: number
  latestNote: Note
  cardSx?: SxProps<Theme>
}> = ({ studyId, latestNote, cardSx }) => {
  return <NoteBase studyId={studyId} latestNote={latestNote} cardSx={cardSx} />
}

const useConfirmCloseDialog = (
  handleClose: () => void
): [() => void, () => React.ReactNode] => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  const zIndex = theme.zIndex.snackbar - 1
  const openDialog = () => {
    setOpen(true)
  }
  const renderDialog = () => {
    return (
      <Dialog
        open={open}
        sx={{
          zIndex: zIndex,
        }}
      >
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to save or discard your changes?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Discard
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
            }}
            color="primary"
          >
            Stay
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  return [openDialog, renderDialog]
}

export const MarkdownRenderer: FC<{ body: string }> = ({ body }) => (
  <ReactMarkdown
    children={body}
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeMathjax, rehypeRaw]}
    components={{
      code: CodeBlock,
      img: (props) => <img {...props} style={{ maxWidth: "100%" }} />,
    }}
  />
)

const MarkdownEditorModal: FC<{
  studyId: number
  trialId?: number
  latestNote: Note
  setEditorUnmount: () => void
}> = ({ studyId, trialId, latestNote, setEditorUnmount }) => {
  const theme = useTheme()
  const action = actionCreator()
  const [openConfirmCloseDialog, renderConfirmCloseDialog] =
    useConfirmCloseDialog(() => {
      setEditorUnmount()
      window.onbeforeunload = null
    })

  const [saving, setSaving] = useState(false)
  const [edited, setEdited] = useState(false)
  const [curNote, setCurNote] = useState({ version: 0, body: "" })
  const textAreaRef = createRef<HTMLTextAreaElement>()
  const notLatest = latestNote.version > curNote.version
  const artifactEnabled = useAtomValue<boolean>(artifactIsAvailable)

  const [previewMarkdown, setPreviewMarkdown] = useState<string>("")
  const [preview, setPreview] = useState<boolean>(false)

  useEffect(() => {
    setCurNote(latestNote)
  }, [])
  useEffect(() => {
    if (edited) {
      window.onbeforeunload = (e) => {
        e.returnValue = "Are you okay to discard your changes?"
      }
    } else {
      window.onbeforeunload = null
    }
  }, [edited])
  const handleSave = () => {
    const nextVersion = curNote.version + 1
    const newNote = {
      version: nextVersion,
      body: textAreaRef.current ? textAreaRef.current.value : "",
    }
    setSaving(true)
    let actionResponse: Promise<void>
    if (trialId === undefined) {
      actionResponse = action.saveStudyNote(studyId, newNote)
    } else {
      actionResponse = action.saveTrialNote(studyId, trialId, newNote)
    }
    actionResponse
      .then(() => {
        setCurNote(newNote)
        window.onbeforeunload = null
        setEditorUnmount()
      })
      .finally(() => {
        setSaving(false)
      })
  }
  const handleRefresh = () => {
    if (!textAreaRef.current) {
      console.log("Unexpectedly, textarea is not found.")
      return
    }
    textAreaRef.current.value = latestNote.body
    setCurNote(latestNote)
    window.onbeforeunload = null
  }

  const insertTextFromCursorPoint = (text: string) => {
    if (textAreaRef.current === null) {
      return
    }
    const cursorPosition = textAreaRef.current.selectionStart
    const currentBody = textAreaRef.current.value
    textAreaRef.current.value =
      currentBody.substring(0, cursorPosition) +
      text +
      currentBody.substring(cursorPosition, currentBody.length)
    setEdited(true)
  }

  // See https://github.com/iamhosseindhv/notistack/issues/231#issuecomment-825924840
  const zIndex = theme.zIndex.snackbar - 2

  return (
    <Card
      sx={{
        bottom: 0,
        height: "100%",
        left: 0,
        overflow: "scroll",
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: zIndex,
        p: theme.spacing(2),
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader
        action={
          <IconButton
            onClick={() => {
              setPreview(!preview)
              setPreviewMarkdown(
                textAreaRef.current ? textAreaRef.current.value : ""
              )
            }}
          >
            {preview ? (
              <ModeEditIcon color="primary" />
            ) : (
              <HtmlIcon color="primary" />
            )}
          </IconButton>
        }
        title="Markdown Editor"
      />
      <Box
        component="div"
        sx={{
          flexGrow: 1,
          padding: theme.spacing(2),
          display: preview ? "default" : "none",
          overflow: "scroll",
        }}
      >
        <MarkdownRenderer body={previewMarkdown} />
      </Box>
      <Box
        component="div"
        sx={{
          width: "100%",
          flexGrow: 1,
          display: preview ? "none" : "flex",
          flexDirection: "row",
          margin: theme.spacing(1, 0),
        }}
      >
        <TextField
          disabled={saving}
          multiline={true}
          placeholder={placeholder}
          sx={{
            position: "relative",
            resize: "none",
            width: "100%",
            height: "100%",
            "& .MuiInputBase-root": {
              height: "100%",
              alignItems: "start",
            },
          }}
          inputRef={textAreaRef}
          defaultValue={latestNote.body}
          onChange={() => {
            const cur = textAreaRef.current ? textAreaRef.current.value : ""
            if (edited !== (cur !== curNote.body)) {
              setEdited(cur !== curNote.body)
            }
          }}
        />
        {artifactEnabled && trialId !== undefined && (
          <ArtifactUploader
            studyId={studyId}
            trialId={trialId}
            insert={insertTextFromCursorPoint}
          />
        )}
      </Box>
      <Box
        component="div"
        sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}
      >
        {notLatest && !saving && (
          <>
            <Typography
              sx={{
                color: theme.palette.error.main,
                fontSize: "0.8rem",
                display: "inline",
              }}
            >
              The text you are editing has updated. Do you want to discard your
              changes and refresh the textarea?
            </Typography>
            <Button
              variant="text"
              onClick={handleRefresh}
              color="error"
              size="small"
              sx={{ textDecoration: "underline" }}
            >
              Yes
            </Button>
          </>
        )}
        <Box component="div" sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          onClick={() => {
            if (edited) {
              openConfirmCloseDialog()
            } else {
              setEditorUnmount()
            }
          }}
          startIcon={<CloseIcon />}
        >
          Close
        </Button>
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          loadingPosition="start"
          startIcon={<SaveIcon />}
          variant="contained"
          disabled={!edited || notLatest}
          sx={{ marginLeft: theme.spacing(1) }}
        >
          Save
        </LoadingButton>
      </Box>
      {renderConfirmCloseDialog()}
    </Card>
  )
}

const ArtifactUploader: FC<{
  studyId: number
  trialId: number
  insert: (text: string) => void
}> = ({ studyId, trialId, insert }) => {
  const theme = useTheme()
  const action = actionCreator()

  const uploading = useAtomValue<boolean>(isFileUploading)
  const artifacts = useArtifacts(studyId, trialId)
  const [dragOver, setDragOver] = useState<boolean>(false)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>("")

  const inputRef = useRef<HTMLInputElement>(null)
  const handleClick: MouseEventHandler = () => {
    if (!inputRef || !inputRef.current) {
      return
    }
    inputRef.current.click()
  }
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files
    if (files === null) {
      return
    }
    action.uploadTrialArtifact(studyId, trialId, files[0])
  }

  const handleDrop: DragEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    setDragOver(false)
    action.uploadTrialArtifact(studyId, trialId, file)
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
    <Box
      component="div"
      sx={{
        width: "300px",
        padding: theme.spacing(0, 1),
        display: "flex",
        flexDirection: "column",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Typography
        sx={{
          fontWeight: theme.typography.fontWeightBold,
          margin: theme.spacing(1, 0),
        }}
      >
        Image
      </Typography>
      <LoadingButton
        loading={uploading}
        loadingPosition="start"
        startIcon={<UploadFileIcon />}
        onClick={handleClick}
        variant="outlined"
      >
        Upload
      </LoadingButton>
      <input
        type="file"
        ref={inputRef}
        onChange={handleOnChange}
        style={{ display: "none" }}
      />
      <Box
        component="div"
        sx={{
          border: dragOver
            ? `3px dashed ${theme.palette.mode === "dark" ? "white" : "black"}`
            : `1px solid ${theme.palette.divider}`,
          margin: theme.spacing(1, 0),
          borderRadius: "4px",
          flexGrow: 1,
          flexBasis: 0,
          overflow: "scroll",
        }}
      >
        {dragOver && (
          <Box
            component="div"
            sx={{
              width: "100%",
              height: "100%",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(0,0,0,0.3)",
            }}
          >
            <UploadFileIcon
              sx={{ fontSize: 80, marginBottom: theme.spacing(2) }}
            />
            <Typography>Upload a New Image</Typography>
            <Typography
              sx={{ textAlign: "center", color: theme.palette.grey.A400 }}
            >
              Drag your file here.
            </Typography>
          </Box>
        )}
        <ImageList cols={1} sx={{ margin: 0 }}>
          {artifacts
            .filter((a) => a.mimetype.startsWith("image"))
            .map((a) => (
              <ImageListItem
                key={a.artifact_id}
                onClick={() => {
                  if (selectedArtifactId === a.artifact_id) {
                    setSelectedArtifactId("")
                  } else {
                    setSelectedArtifactId(a.artifact_id)
                  }
                }}
                sx={{
                  border:
                    selectedArtifactId === a.artifact_id
                      ? `2px solid ${theme.palette.primary.main}`
                      : "none",
                }}
              >
                <img
                  src={`/artifacts/${studyId}/${trialId}/${a.artifact_id}`}
                />
                <ImageListItemBar title={a.filename} />
              </ImageListItem>
            ))}
        </ImageList>
      </Box>
      <Button
        variant="outlined"
        disabled={selectedArtifactId === ""}
        onClick={() => {
          if (selectedArtifactId === "") {
            return
          }
          const artifact = artifacts.find(
            (a) => a.artifact_id === selectedArtifactId
          )
          if (artifact === undefined) {
            return
          }
          insert(
            `![${artifact.filename}](/artifacts/${studyId}/${trialId}/${artifact.artifact_id})\n`
          )
          setSelectedArtifactId("")
        }}
      >
        Insert an image
      </Button>
    </Box>
  )
}

const NoteBase: FC<{
  studyId: number
  trialId?: number
  latestNote: Note
  cardSx?: SxProps<Theme>
}> = ({ studyId, trialId, latestNote, cardSx }) => {
  const theme = useTheme()
  const [editorMounted, setEditorMounted] = useState<boolean>(false)

  const defaultBody = ""
  return (
    <Card sx={{ overflow: "scroll", ...cardSx }}>
      <CardContent
        sx={{
          paddingTop: theme.spacing(1),
          position: "relative",
          minHeight: theme.spacing(7),
        }}
      >
        <MarkdownRenderer body={latestNote.body || defaultBody} />
        <IconButton
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            margin: theme.spacing(1),
          }}
          onClick={() => {
            setEditorMounted(true)
          }}
        >
          <EditIcon />
        </IconButton>
      </CardContent>
      {editorMounted && (
        <MarkdownEditorModal
          studyId={studyId}
          trialId={trialId}
          latestNote={latestNote}
          setEditorUnmount={() => {
            setEditorMounted(false)
          }}
        />
      )}
    </Card>
  )
}
