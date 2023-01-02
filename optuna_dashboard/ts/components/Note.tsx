import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton, Modal,
  SxProps,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import React, { FC, createRef, useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import LoadingButton from "@mui/lab/LoadingButton"
import SaveIcon from "@mui/icons-material/Save"
import EditIcon from "@mui/icons-material/Edit"
import Divider from "@mui/material/Divider"
import { Theme } from "@mui/material/styles"
import {
  CodeComponent,
  ReactMarkdownNames,
} from "react-markdown/lib/ast-to-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism"

import { actionCreator } from "../action"
import {styled} from "@mui/system";

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
      minRows={10}
      cardSx={cardSx}
    />
  )
}

export const StudyNote: FC<{
  studyId: number
  latestNote: Note
  minRows: number
  cardSx?: SxProps<Theme>
}> = ({ studyId, latestNote, minRows, cardSx }) => {
  return (
    <NoteBase
      studyId={studyId}
      latestNote={latestNote}
      minRows={minRows}
      cardSx={cardSx}
    />
  )
}

const MarkdownEditorModal: FC<{
  studyId: number
  trialId?: number
  latestNote?: Note
  open: boolean
}> = ({ studyId, trialId, latestNote, open}) => {
  const theme = useTheme()
  const action = actionCreator()
  const [saving, setSaving] = useState(false)
  const [edited, setEdited] = useState(false)
  const [curNote, setCurNote] = useState({ version: 0, body: "" })

  const textAreaRef = createRef<HTMLTextAreaElement>()
  const notLatest = latestNote !== undefined && latestNote.version > curNote.version

  useEffect(() => {
    if (latestNote === undefined) {
      return
    }
    if (!textAreaRef.current) {
      console.log("Unexpectedly, textarea is not found.")
      return
    }
    textAreaRef.current.value = latestNote.body
    setCurNote(latestNote)
    window.onbeforeunload = null
  }, [trialId])
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
        })
        .finally(() => {
          setSaving(false)
        })
  }
  const handleRefresh = () => {
    if (latestNote === undefined) {
      return
    }
    if (!textAreaRef.current) {
      console.log("Unexpectedly, textarea is not found.")
      return
    }
    textAreaRef.current.value = latestNote.body
    setCurNote(latestNote)
    window.onbeforeunload = null
  }

  const EditorField = styled(TextField)(({ theme }) => ({
    "& .MuiInputBase-root": { height: "100%"},
  }))

  return (
      <Modal open={open}>
        {latestNote === undefined ? (<Typography>Now Loading...</Typography>) : (
            <Card sx={{
              bottom: 0,
              height: "100%",
              left: 0,
              overflow: "hidden",
              position: "fixed",
              right: 0,
              top: 0,
              zIndex: 99999,
              p: theme.spacing(2),
              display: "flex",
              flexDirection: "column"
            }}>
              <EditorField
                  disabled={saving}
                  multiline={true}
                  placeholder={`Description about the ${
                      trialId === undefined ? "study" : "trial"
                  }... (Markdown)`}
                  sx={{
                    position: "relative",
                    resize: "none",
                    width: "100%", height: "100%", margin: `${theme.spacing(1)} 0` }}
                  inputProps={{ style: { resize: "none", overflow: "scroll", height: "100%" }, sx: {height: "100%"} }}
                  inputRef={textAreaRef}
                  defaultValue={latestNote.body}
                  onChange={() => {
                    const cur = textAreaRef.current ? textAreaRef.current.value : ""
                    setEdited(cur !== curNote.body)
                  }}
              />
              <Box
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
                        The text you are editing has updated. Do you want to discard
                        your changes and refresh the textarea?
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
                <LoadingButton
                    onClick={handleSave}
                    loading={saving}
                    loadingPosition="start"
                    startIcon={<SaveIcon />}
                    variant="contained"
                    disabled={!edited}
                >
                  Save
                </LoadingButton>
              </Box>
            </Card>
        )}
      </Modal>
  )
}

const NoteBase: FC<{
  studyId: number
  trialId?: number
  latestNote: Note
  minRows: number
  cardSx?: SxProps<Theme>
}> = ({ studyId, trialId, latestNote, minRows, cardSx }) => {
  const theme = useTheme()

  const defaultBody =
      "*A markdown editor for taking a memo, related to the study. Click the 'Edit' button in the upper right corner to access the editor.*"
  let content = null

  if (latestNote !== undefined) {
    content =  (
        <ReactMarkdown
            children={latestNote.body || defaultBody}
            remarkPlugins={[remarkGfm]}
            components={{ code: CodeBlock }}
        />
    )
  }

  return (
    <Card sx={{ margin: theme.spacing(2), ...cardSx }}>
      <CardHeader
        title="Note"
        action={
            <IconButton onClick={() => { console.log("Clicked!")}}>
              <EditIcon />
            </IconButton>
        }
        sx={{ paddingBottom: 0 }}
      />
      <CardContent sx={{ paddingTop: theme.spacing(1) }}>
        <Divider />
        {content}
      </CardContent>
      <MarkdownEditorModal studyId={studyId} trialId={trialId} latestNote={latestNote} open={true} />
    </Card>
  )
}
