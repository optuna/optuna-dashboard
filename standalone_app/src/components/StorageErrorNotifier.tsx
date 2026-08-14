import { useSnackbar } from "notistack"
import { FC, useContext, useEffect } from "react"
import { StorageContext } from "./StorageProvider"

// Storage failures used to be visible only while the loader was on screen, so a
// query that failed after the storage had opened, or anything at all in the VS
// Code Webview where the loader is never rendered, left the page empty without
// telling why.
export const StorageErrorNotifier: FC = () => {
  const { error } = useContext(StorageContext)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    if (error === null) {
      return
    }
    enqueueSnackbar(error.message, { variant: "error" })
  }, [enqueueSnackbar, error])

  return null
}
