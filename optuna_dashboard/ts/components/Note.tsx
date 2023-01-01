import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
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
import CloseIcon from "@mui/icons-material/Close"
import Divider from "@mui/material/Divider"
import { Theme } from "@mui/material/styles"
import {
  CodeComponent,
  ReactMarkdownNames,
} from "react-markdown/lib/ast-to-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism"

import { actionCreator } from "../action"

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
  editable: boolean
}> = ({ studyId, trialId, latestNote, editable }) => {
  return (
    <NoteBase
      studyId={studyId}
      trialId={trialId}
      latestNote={latestNote}
      minRows={5}
      editable={editable}
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
      editable={true}
    />
  )
}

export const NoteBase: FC<{
  studyId: number
  trialId?: number
  latestNote: Note
  minRows: number
  editable: boolean
  cardSx?: SxProps<Theme>
}> = ({ studyId, trialId, latestNote, minRows, editable, cardSx }) => {
  const theme = useTheme()
  const [renderMarkdown, setRenderMarkdown] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edited, setEdited] = useState(false)
  const [curNote, setCurNote] = useState({ version: 0, body: "" })
  const textAreaRef = createRef<HTMLTextAreaElement>()
  const action = actionCreator()
  const notLatest = latestNote.version > curNote.version

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
        setRenderMarkdown(true)
        window.onbeforeunload = null
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
  let defaultBody: string
  if (editable) {
    defaultBody =
      "*A markdown editor for taking a memo, related to the study. Click the 'Edit' button in the upper right corner to access the editor.*"
  } else {
    defaultBody = ""
  }

  let content
  if (renderMarkdown) {
    content = (
      <ReactMarkdown
        children={latestNote.body || defaultBody}
        remarkPlugins={[remarkGfm]}
        components={{ code: CodeBlock }}
      />
    )
  } else {
    content = (
      <>
        <TextField
          disabled={saving}
          minRows={minRows}
          multiline={true}
          placeholder={`Description about the ${
            trialId === undefined ? "study" : "trial"
          }...`}
          sx={{ width: "100%", margin: `${theme.spacing(1)} 0` }}
          inputProps={{ style: { resize: "vertical" } }}
          inputRef={textAreaRef}
          defaultValue={curNote.body}
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
      </>
    )
  }

  return (
    <Card sx={{ margin: theme.spacing(2), ...cardSx }}>
      <CardHeader
        title="Note"
        action={
          !renderMarkdown ? (
            <IconButton
              onClick={() => {
                setRenderMarkdown(true)
              }}
            >
              <CloseIcon />
            </IconButton>
          ) : (
            <IconButton
              disabled={!editable}
              onClick={() => setRenderMarkdown(false)}
            >
              <EditIcon />
            </IconButton>
          )
        }
        sx={{ paddingBottom: 0 }}
      />
      <CardContent sx={{ paddingTop: theme.spacing(1) }}>
        <Divider />
        {content}
      </CardContent>
    </Card>
  )
}
