import { Search } from "@mui/icons-material"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import SortIcon from "@mui/icons-material/Sort"
import {
  AppBar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  SvgIcon,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material"
import { styled } from "@mui/system"
import React, {
  FC,
  useEffect,
  useContext,
  useState,
  useMemo,
  useDeferredValue,
} from "react"
import { Link } from "react-router-dom"
import { StorageLoader } from "./StorageLoader"
import { StorageContext } from "./StorageProvider"

export const StudyList: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const { storage } = useContext(StorageContext)
  const [studies, setStudies] = useState<StudySummary[]>([])

  const [_studyFilterText, setStudyFilterText] = useState<string>("")
  const [sortBy, setSortBy] = useState<"id-asc" | "id-desc">("id-asc")
  const studyFilterText = useDeferredValue(_studyFilterText)
  useEffect(() => {
    const fetchStudies = async () => {
      if (storage === null) {
        return
      }
      const studies = await storage.getStudies()
      setStudies(studies)
    }
    fetchStudies()
  }, [storage])
  const filteredStudies = useMemo(() => {
    const studyFilter = (row: StudySummary): boolean => {
      const keywords = studyFilterText.split(" ")
      return !keywords.every((k) => {
        if (k === "") {
          return true
        }
        return row.study_name.indexOf(k) >= 0
      })
    }
    let filteredStudies: StudySummary[] = studies.filter((s) => !studyFilter(s))
    if (sortBy === "id-desc") {
      filteredStudies = filteredStudies.reverse()
    }
    return filteredStudies
  }, [studyFilterText, studies, sortBy])

  const Select = styled(TextField)(({ theme }) => ({
    "& .MuiInputBase-input": {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    },
  }))
  const sortBySelect = (
    <Box
      sx={{
        position: "relative",
        borderRadius: theme.shape.borderRadius,
        margin: theme.spacing(0, 2),
      }}
    >
      <Box
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
          setSortBy(e.target.value as "id-asc" | "id-desc")
        }}
      >
        <MenuItem value={"id-asc"}>Sort ascending</MenuItem>
        <MenuItem value={"id-desc"}>Sort descending</MenuItem>
      </Select>
    </Box>
  )

  return (
    <div>
      <AppBar position="static">
        <Container
          sx={{
            "@media (min-width: 1280px)": {
              maxWidth: "100%",
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6">Optuna Dashboard (Wasm ver.)</Typography>
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
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        sx={{
          "@media (min-width: 1280px)": {
            maxWidth: "100%",
          },
        }}
      >
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Box sx={{ display: "flex" }}>
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
              <Box sx={{ flexGrow: 1 }} />
            </Box>
          </CardContent>
        </Card>
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          {filteredStudies.map((study, idx) => (
            <Card
              key={study.study_id}
              sx={{ margin: theme.spacing(2), width: "500px" }}
            >
              <CardActionArea component={Link} to={`/${idx}`}>
                <CardContent>
                  <Typography variant="h5">
                    {study.study_id}. {study.study_name}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    color="text.secondary"
                    component="div"
                  >
                    {`Direction: ${study.directions
                      .map((d) => d.toUpperCase())
                      .join(", ")}`}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        {!IS_VSCODE && <StorageLoader />}
      </Container>
    </div>
  )
}
