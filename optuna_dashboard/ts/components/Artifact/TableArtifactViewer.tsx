import ClearIcon from "@mui/icons-material/Clear"
import { Box, Modal, useTheme } from "@mui/material"
import IconButton from "@mui/material/IconButton"
import { DataGrid } from "@optuna/react"
import { useSnackbar } from "notistack"
import Papa from "papaparse"
import React, { useState, useEffect, ReactNode } from "react"

import { Artifact } from "ts/types/optuna"

import axios from "axios"

export const isTableArtifact = (artifact: Artifact): boolean => {
  return (
    artifact.filename.endsWith(".csv") || artifact.filename.endsWith(".jsonl")
  )
}

interface TableArtifactViewerProps {
  src: string
  filetype: string | undefined
}

type Data = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export const TableArtifactViewer: React.FC<TableArtifactViewerProps> = (
  props
) => {
  const [data, setData] = useState<Data[]>([])
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    const handleFileChange = async () => {
      try {
        const loadedData = await loadData(props)
        setData(loadedData)
      } catch (error: unknown) {
        enqueueSnackbar(`Failed to load the file. ${error}`, {
          variant: "error",
        })
      }
    }
    handleFileChange()
  }, [props])

  const columns = React.useMemo(() => {
    const unionSet: Set<string> = new Set()
    data.forEach((d) => {
      Object.keys(d).forEach((key) => {
        unionSet.add(key)
      })
    })
    const keys = Array.from(unionSet)
    return keys.map((key) => ({
      // ``header`` cannot be a falsy value, so replace key with a string looking like an empty string.
      header: key || " ",
      accessorFn: (info: Data) =>
        typeof info[key] === "object" ? JSON.stringify(info[key]) : info[key],
      enableSorting: true,
      enableColumnFilter: false,
    }))
  }, [data])

  return <DataGrid data={data} columns={columns} initialRowsPerPage={10} />
}

export const useTableArtifactModal = (): [
  (path: string, artifact: Artifact) => void,
  () => ReactNode,
] => {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<[string, Artifact | null]>(["", null])
  const theme = useTheme()

  const openModal = (artifactUrlPath: string, artifact: Artifact) => {
    setTarget([artifactUrlPath, artifact])
    setOpen(true)
  }

  const renderDeleteStudyDialog = () => {
    return (
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setTarget(["", null])
        }}
      >
        <Box
          component="div"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: "15px",
            width: "80%",
            maxHeight: "80%",
            overflowY: "auto",
            p: 2,
          }}
        >
          <IconButton
            sx={{
              position: "absolute",
              top: theme.spacing(2),
              right: theme.spacing(2),
            }}
            onClick={() => {
              setOpen(false)
              setTarget(["", null])
            }}
          >
            <ClearIcon />
          </IconButton>
          <TableArtifactViewer
            src={target[0]}
            filetype={target[1]?.filename.split(".").pop()}
          />
        </Box>
      </Modal>
    )
  }
  return [openModal, renderDeleteStudyDialog]
}

const loadData = (props: TableArtifactViewerProps): Promise<Data[]> => {
  if (props.filetype === "csv") {
    return loadCSV(props)
  } else if (props.filetype === "jsonl") {
    return loadJsonl(props)
  } else {
    return Promise.reject(new Error("Unsupported file type"))
  }
}

const loadCSV = (props: TableArtifactViewerProps): Promise<Data[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(props.src, {
      header: true,
      download: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Data>) => {
        resolve(results?.data)
      },
      error: () => {
        reject(new Error("CSV parse error"))
      },
    })
  })
}

const loadJsonl = async (props: TableArtifactViewerProps): Promise<Data[]> => {
  const response = await axios.get(props.src, { responseType: "text" })
  const data = response.data
  try {
    const jsons = data
      .split("\n")
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => {
        return JSON.parse(line)
      })
      .filter(Boolean) as Data[]
    return jsons
  } catch (error) {
    throw new Error("JSONL parse error")
  }
}
