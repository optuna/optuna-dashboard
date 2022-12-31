import React, { FC, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import { Link } from "react-router-dom"
import {
  Typography,
  Container,
  Card,
  Box,
  Button,
  IconButton,
  MenuItem,
  useTheme,
  InputAdornment,
  SvgIcon,
  CardContent,
  TextField,
} from "@mui/material"
import { Delete, Refresh, Search } from "@mui/icons-material"
import SortIcon from "@mui/icons-material/Sort"
import AddBoxIcon from "@mui/icons-material/AddBox"

import { actionCreator } from "../action"
import { DebouncedInputTextField } from "./Debounce"
import { studySummariesState } from "../state"
import { styled } from "@mui/system"
import { AppDrawer } from "./AppDrawer"
import { useCreateStudyDialog } from "./CreateStudyDialog"
import { useDeleteStudyDialog } from "./DeleteStudyDialog"

export const StudyListBeta: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const action = actionCreator()

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
  const [openCreateStudyDialog, renderCreateStudyDialog] =
    useCreateStudyDialog()
  const [openDeleteStudyDialog, renderDeleteStudyDialog] =
    useDeleteStudyDialog()
  const linkColor = useMemo(
    () =>
      theme.palette.mode === "dark"
        ? theme.palette.primary.light
        : theme.palette.primary.dark,
    [theme.palette.mode]
  )

  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const filteredStudy = studies.filter((s) => !studyFilter(s))

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  const Wrapper = styled("div")(({ theme }) => ({
    position: "relative",
    borderRadius: theme.shape.borderRadius,
  }))
  const IconWrapper = styled("div")(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }))
  const Select = styled(TextField)(({ theme }) => ({
    "& .MuiInputBase-input": {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    },
  }))
  const sortBySelect = (
    <Wrapper>
      <IconWrapper>
        <SortIcon />
      </IconWrapper>
      <Select select value={"id-asc"}>
        <MenuItem value={"id-asc"}>Study ID (asc)</MenuItem>
        <MenuItem value={"id-desc"}>Study ID (desc)</MenuItem>
      </Select>
    </Wrapper>
  )

  const toolbar = (
    <Typography variant="h5" noWrap component="div">
      Optuna Dashboard (Beta UI)
    </Typography>
  )

  return (
    <Box sx={{ display: "flex" }}>
      <AppDrawer toggleColorMode={toggleColorMode} toolbar={toolbar}>
        <Container
          sx={{
            ["@media (min-width: 1280px)"]: {
              maxWidth: "100%",
            },
          }}
        >
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <Box sx={{ display: "flex" }}>
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
                    sx: { maxWidth: 500 },
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
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<AddBoxIcon />}
                  aria-haspopup="true"
                  onClick={(e) => {
                    openCreateStudyDialog()
                  }}
                  sx={{ marginRight: theme.spacing(2) }}
                >
                  Create
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  aria-haspopup="true"
                  onClick={(e) => {
                    action.updateStudySummaries("Success to reload")
                  }}
                  sx={{ marginRight: theme.spacing(2) }}
                >
                  Refresh
                </Button>
                {sortBySelect}
              </Box>
            </CardContent>
          </Card>
          {filteredStudy.map((study) => (
            <Card key={study.study_id} sx={{ margin: theme.spacing(2) }}>
              <CardContent sx={{ margin: theme.spacing(2) }}>
                <Typography variant="h5">
                  <Link
                    to={`${URL_PREFIX}/studies/${study.study_id}/beta`}
                    style={{ color: linkColor }}
                  >
                    {study.study_name}
                  </Link>
                </Typography>
                <Typography>{study.study_id}</Typography>
                <Typography>
                  {study.directions.map((d) => d.toString()).join(" ")}
                </Typography>
                <IconButton
                  aria-label="delete study"
                  size="small"
                  color="inherit"
                  onClick={() => {
                    openDeleteStudyDialog(study.study_id)
                  }}
                >
                  <Delete />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Container>
      </AppDrawer>
      {renderCreateStudyDialog()}
      {renderDeleteStudyDialog()}
    </Box>
  )
}
