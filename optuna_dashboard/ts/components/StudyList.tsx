import React, { FC, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import { Link } from "react-router-dom"
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  Grid,
  Box,
  IconButton,
  useTheme,
  InputAdornment,
  SvgIcon,
  CardContent,
} from "@mui/material"
import { AddBox, Delete, Refresh, Search } from "@mui/icons-material"

import { actionCreator } from "../action"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { DebouncedInputTextField } from "./Debounce"
import { studySummariesState } from "../state"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import { useDeleteStudyDialog } from "./DeleteStudyDialog"
import { useCreateStudyDialog } from "./CreateStudyDialog"

export const StudyList: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()

  const [studyFilterText, setStudyFilterText] = React.useState<string>("")
  const studyFilter = (row: StudySummary) => {
    const keywords = studyFilterText.split(" ")
    return !keywords.every((k) => {
      if (k === "") {
        return true
      }
      return row.study_name.indexOf(k) >= 0
    })
  }
  const [openDeleteStudyDialog, renderDeleteStudyDialog] =
    useDeleteStudyDialog()
  const [openCreateStudyDialog, renderCreateStudyDialog] =
    useCreateStudyDialog()

  const linkColor = useMemo(
    () =>
      theme.palette.mode === "dark"
        ? theme.palette.primary.light
        : theme.palette.primary.dark,
    [theme.palette.mode]
  )

  const action = actionCreator()
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const columns: DataGridColumn<StudySummary>[] = [
    {
      field: "study_id",
      label: "Study ID",
      sortable: true,
    },
    {
      field: "study_name",
      label: "Name",
      sortable: true,
      toCellValue: (i) => (
        <Link
          to={`${URL_PREFIX}/studies/${studies[i].study_id}`}
          style={{ color: linkColor }}
        >
          {studies[i].study_name}
        </Link>
      ),
    },
    {
      field: "directions",
      label: "Direction",
      sortable: false,
      toCellValue: (i) => studies[i].directions.join(),
    },
    {
      field: "study_name",
      label: "",
      sortable: false,
      padding: "none",
      toCellValue: (i) => (
        <IconButton
          aria-label="delete study"
          size="small"
          color="inherit"
          onClick={() => {
            openDeleteStudyDialog(studies[i].study_id)
          }}
        >
          <Delete />
        </IconButton>
      ),
    },
  ]

  const collapseAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]

  const collapseBody = (index: number) => {
    return (
      <Grid container direction="row">
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Study user attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={studies[index].user_attrs}
              keyField={"key"}
              dense={true}
              initialRowsPerPage={5}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box margin={1}>
            <Typography variant="h6" gutterBottom component="div">
              Study system attributes
            </Typography>
            <DataGrid<Attribute>
              columns={collapseAttrColumns}
              rows={studies[index].system_attrs}
              keyField={"key"}
              dense={true}
              initialRowsPerPage={5}
              rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            />
          </Box>
        </Grid>
      </Grid>
    )
  }

  return (
    <>
      <AppBar position="static">
        <Container
          sx={{
            ["@media (min-width: 1280px)"]: {
              maxWidth: "100%",
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6">{APP_BAR_TITLE}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() => {
                toggleColorMode()
              }}
              color="inherit"
              title={
                theme.palette.mode === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {theme.palette.mode === "dark" ? (
                <Brightness7Icon />
              ) : (
                <Brightness4Icon />
              )}
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={() => {
                action.updateStudySummaries("Success to reload")
              }}
              color="inherit"
              title="Reload studies"
            >
              <Refresh />
            </IconButton>
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={(e) => {
                openCreateStudyDialog()
              }}
              color="inherit"
              title="Create new study"
            >
              <AddBox />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        sx={{
          ["@media (min-width: 1280px)"]: {
            maxWidth: "100%",
          },
        }}
      >
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Typography
              variant="h5"
              style={{ paddingBottom: theme.spacing(1) }}
            >
              Announcement
            </Typography>
            <Typography>
              {`Please go to `}
              <Link to={`${URL_PREFIX}/beta`} style={{ color: linkColor }}>
                our experimental new UI page
              </Link>
              {" and share your thoughts with us via "}
              <Link to={`${URL_PREFIX}/beta`} style={{ color: linkColor }}>
                the GitHub Discussion's post
              </Link>
              {"."}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Box sx={{ maxWidth: 500 }}>
              <DebouncedInputTextField
                onChange={(s) => {
                  setStudyFilterText(s)
                }}
                delay={500}
                textFieldProps={{
                  fullWidth: true,
                  id: "search-study",
                  variant: "outlined",
                  placeholder: "Search study",
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SvgIcon fontSize="small" color="action">
                          <Search />
                        </SvgIcon>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <DataGrid<StudySummary>
            columns={columns}
            rows={studies}
            keyField={"study_id"}
            collapseBody={collapseBody}
            initialRowsPerPage={10}
            rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
            defaultFilter={studyFilter}
          />
        </Card>
      </Container>
      {renderCreateStudyDialog()}
      {renderDeleteStudyDialog()}
    </>
  )
}
