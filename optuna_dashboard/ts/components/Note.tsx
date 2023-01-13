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
  SxProps,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import React, { FC, createRef, useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeMathjax from "rehype-mathjax"
import LoadingButton from "@mui/lab/LoadingButton"
import SaveIcon from "@mui/icons-material/Save"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import Divider from "@mui/material/Divider"
import { Theme } from "@mui/material/styles"
import {
  CodeComponent,
  ReactMarkdownNames,
} from "react-markdown/lib/ast-to-react"
import HtmlIcon from "@mui/icons-material/Html"
import ModeEditIcon from "@mui/icons-material/ModeEdit"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism"

import { actionCreator } from "../action"

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
  inline,
  className,
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

const MarkdownRenderer: FC<{ body: string }> = ({ body }) => (
  <ReactMarkdown
    children={body}
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeMathjax]}
    components={{ code: CodeBlock }}
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

  // See https://github.com/iamhosseindhv/notistack/issues/231#issuecomment-825924840
  const zIndex = theme.zIndex.snackbar - 2

  return (
    <Card
      sx={{
        bottom: 0,
        height: "100%",
        left: 0,
        overflow: "hidden",
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
        sx={{
          height: "100%",
          padding: theme.spacing(2),
          display: preview ? "default" : "none",
          overflow: "scroll",
        }}
      >
        <MarkdownRenderer body={previewMarkdown} />
      </Box>
      <TextField
        disabled={saving}
        multiline={true}
        placeholder={placeholder}
        sx={{
          position: "relative",
          resize: "none",
          width: "100%",
          height: "100%",
          margin: theme.spacing(1, 0),
          display: preview ? "none" : "default",
          "& .MuiInputBase-root": { height: "100%" },
        }}
        inputProps={{
          style: { resize: "none", overflow: "scroll", height: "100%" },
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
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
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
        <Box sx={{ flexGrow: 1 }} />
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
      <CardHeader
        title="Note"
        action={
          <IconButton
            onClick={() => {
              setEditorMounted(true)
            }}
          >
            <EditIcon />
          </IconButton>
        }
        sx={{ paddingBottom: 0 }}
      />
      <CardContent sx={{ paddingTop: theme.spacing(1) }}>
        <Divider />
        <MarkdownRenderer body={latestNote.body || defaultBody} />
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
