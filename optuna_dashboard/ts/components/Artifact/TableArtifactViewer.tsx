import Papa from "papaparse"
import React, { useState } from "react"
import { DataGrid } from "../DataGrid"

import { Artifact } from "ts/types/optuna"

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
  [key: string]: any
}

export const TableArtifactViewer: React.FC<TableArtifactViewerProps> = (
  props
) => {
  const [data, setData] = useState<Data[]>([])
  const handleFileChange = async () => {
    const loadedData = await loadCSV(props)
    setData(loadedData)
  }
  handleFileChange()
  console.log(data)

  const columns = React.useMemo(() => {
    const keys = data[0] ? Object.keys(data[0]) : []
    console.log(keys)
    return keys.map((key) => ({
      accessorKey: key,
      header: key,
    }))
  }, [data])

  return <DataGrid data={data} columns={columns} />
}

const loadCSV = (props: TableArtifactViewerProps): any => {
  return new Promise((resolve, reject) => {
    Papa.parse(props.src, {
      header: true,
      download: true,
      complete: (results: any) => {
        resolve(results?.data)
      },
      error: () => {
        reject(new Error("csv parse err"))
      },
    })
  })
}
