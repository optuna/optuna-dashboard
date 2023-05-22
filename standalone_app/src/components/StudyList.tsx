import React, { FC, useState } from "react"
import {
  AppBar,
  Typography,
  Container,
  Toolbar,
  Box,
  IconButton,
  MenuItem,
  useTheme,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  SvgIcon,
} from "@mui/material"
import { styled } from "@mui/system"
import SortIcon from "@mui/icons-material/Sort"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import { useRecoilValue } from "recoil"
import { studiesState } from "../state"
import { Link } from "react-router-dom"
import { DebouncedInputTextField } from "./Debounce"
import { Search } from "@mui/icons-material"
import { StorageLoader } from "./StorageLoader"

export const StudyList: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const studies = useRecoilValue<Study[]>(studiesState)

  const [studyFilterText, setStudyFilterText] = useState<string>("")
  const [sortBy, setSortBy] = useState<"id-asc" | "id-desc">("id-asc")
  const studyFilter = (row: Study): boolean => {
    const keywords = studyFilterText.split(" ")
    return !keywords.every((k) => {
      if (k === "") {
        return true
      }
      return row.study_name.indexOf(k) >= 0
    })
  }
  let filteredStudies: Study[] = studies.filter((s) => !studyFilter(s))
  if (sortBy === "id-desc") {
    filteredStudies = filteredStudies.reverse()
  }

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
            ["@media (min-width: 1280px)"]: {
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
                    {"Direction: " +
                      study.directions.map((d) => d.toUpperCase()).join(", ")}
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
