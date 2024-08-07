import { Delete, HourglassTop, Refresh, Search } from "@mui/icons-material"
import AddBoxIcon from "@mui/icons-material/AddBox"
import CompareIcon from "@mui/icons-material/Compare"
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline"
import HomeIcon from "@mui/icons-material/Home"
import SortIcon from "@mui/icons-material/Sort"
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  SvgIcon,
  TextField,
  Typography,
  useTheme,
} from "@mui/material"
import React, {
  FC,
  useEffect,
  useState,
  useDeferredValue,
  useMemo,
} from "react"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { useRecoilValue } from "recoil"

import { styled } from "@mui/system"
import { StudySummary } from "ts/types/optuna"
import { actionCreator } from "../action"
import { useConstants } from "../constantsProvider"
import { studySummariesLoadingState, studySummariesState } from "../state"
import { useQuery } from "../urlQuery"
import { AppDrawer } from "./AppDrawer"
import { useCreateStudyDialog } from "./CreateStudyDialog"
import { useDeleteStudyDialog } from "./DeleteStudyDialog"
import { useRenameStudyDialog } from "./RenameStudyDialog"

export const StudyList: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const { url_prefix } = useConstants()

  const theme = useTheme()
  const action = actionCreator()

  const [_studyFilterText, setStudyFilterText] = React.useState<string>("")
  const studyFilterText = useDeferredValue(_studyFilterText)
  const studyFilter = (row: StudySummary) => {
    const keywords = studyFilterText.split(" ")
    return !keywords.every((k) => {
      if (k === "") {
        return true
      }
      return row.study_name.indexOf(k) >= 0
    })
  }
  const studies = useRecoilValue<StudySummary[]>(studySummariesState)
  const [openCreateStudyDialog, renderCreateStudyDialog] =
    useCreateStudyDialog()
  const [openDeleteStudyDialog, renderDeleteStudyDialog] =
    useDeleteStudyDialog()
  const [openRenameStudyDialog, renderRenameStudyDialog] =
    useRenameStudyDialog(studies)
  const isLoading = useRecoilValue<boolean>(studySummariesLoadingState)

  const navigate = useNavigate()
  const query = useQuery()
  const initialSortBy = query.get("studies_order_by") === "asc" ? "asc" : "desc"
  const [sortBy, setSortBy] = useState<"asc" | "desc">(initialSortBy)
  const filteredStudies = useMemo(() => {
    let filteredStudies: StudySummary[] = studies.filter((s) => !studyFilter(s))
    if (sortBy === "desc") {
      filteredStudies = filteredStudies.reverse()
    }
    return filteredStudies
  }, [studyFilterText, studies, sortBy])

  useEffect(() => {
    action.updateStudySummaries()
  }, [])

  useEffect(() => {
    query.set("studies_order_by", sortBy)
    navigate(`${location.pathname}?${query.toString()}`, {
      replace: true,
    })
  }, [sortBy])

  const Select = styled(TextField)(({ theme }) => ({
    "& .MuiInputBase-input": {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    },
  }))
  const sortBySelect = (
    <Box
      component="div"
      sx={{
        position: "relative",
        borderRadius: theme.shape.borderRadius,
        margin: theme.spacing(0, 2),
      }}
    >
      <Box
        component="div"
        sx={{
          padding: theme.spacing(0, 2),
          height: "100%",
          position: "absolute",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SortIcon />
      </Box>
      <Select
        select
        value={sortBy}
        onChange={(e) => {
          setSortBy(e.target.value as "asc" | "desc")
        }}
      >
        <MenuItem value={"asc"}>Sort ascending</MenuItem>
        <MenuItem value={"desc"}>Sort descending</MenuItem>
      </Select>
    </Box>
  )

  const toolbar = <HomeIcon sx={{ margin: theme.spacing(0, 1) }} />

  let studyListContent
  if (isLoading) {
    studyListContent = (
      <Box component="div" sx={{ margin: theme.spacing(2) }}>
        <SvgIcon fontSize="small" color="action">
          <HourglassTop />
        </SvgIcon>
        Loading studies...
      </Box>
    )
  } else {
    studyListContent = filteredStudies.map((study) => (
      <Card
        key={study.study_id}
        sx={{ margin: theme.spacing(2), width: "500px" }}
      >
        <CardActionArea
          component={Link}
          to={`${url_prefix}/studies/${study.study_id}`}
        >
          <CardContent>
            <Typography variant="h5" sx={{ wordBreak: "break-all" }}>
              {study.study_id}. {study.study_name}
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              component="div"
            >
              {study.is_preferential
                ? "Preferential Optimization"
                : "Direction: " +
                  study.directions
                    .map((d) => d.toString().toUpperCase())
                    .join(", ")}
            </Typography>
          </CardContent>
        </CardActionArea>
        <CardActions disableSpacing sx={{ paddingTop: 0 }}>
          <Box component="div" sx={{ flexGrow: 1 }} />
          <IconButton
            aria-label="rename study"
            size="small"
            color="inherit"
            onClick={() => {
              openRenameStudyDialog(study.study_id, study.study_name)
            }}
          >
            <DriveFileRenameOutlineIcon />
          </IconButton>
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
        </CardActions>
      </Card>
    ))
  }

  return (
    <Box component="div" sx={{ display: "flex" }}>
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
              <Box component="div" sx={{ display: "flex" }}>
                <TextField
                  onChange={(e) => {
                    setStudyFilterText(e.target.value)
                  }}
                  id="search-study"
                  variant="outlined"
                  placeholder="Search study"
                  fullWidth
                  sx={{ maxWidth: 500 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SvgIcon fontSize="small" color="action">
                          <Search />
                        </SvgIcon>
                      </InputAdornment>
                    ),
                  }}
                />
                {sortBySelect}
                <Box component="div" sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    action.updateStudySummaries("Success to reload")
                  }}
                  sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
                >
                  Reload
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AddBoxIcon />}
                  onClick={() => {
                    openCreateStudyDialog()
                  }}
                  sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
                >
                  Create
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CompareIcon />}
                  component={Link}
                  to={`${url_prefix}/compare-studies`}
                  sx={{ marginRight: theme.spacing(2), minWidth: "120px" }}
                >
                  Compare
                </Button>
              </Box>
            </CardContent>
          </Card>
          <Box component="div" sx={{ display: "flex", flexWrap: "wrap" }}>
            {studyListContent}
          </Box>
        </Container>
      </AppDrawer>
      {renderCreateStudyDialog()}
      {renderDeleteStudyDialog()}
      {renderRenameStudyDialog()}
    </Box>
  )
}
