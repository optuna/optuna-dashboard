import React, { FC, useEffect } from "react"
import { useRecoilValue } from "recoil"
import { Link } from "react-router-dom"
import {
  Typography,
  Container,
  Card,
  CardActionArea,
  Box,
  Button,
  IconButton,
  MenuItem,
  useTheme,
  InputAdornment,
  SvgIcon,
  CardContent,
  TextField,
  CardActions,
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
        <MenuItem value={"id-asc"}>Oldest</MenuItem>
        <MenuItem value={"id-desc"}>Oldest</MenuItem>
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
                  sx={{ margin: theme.spacing(0, 2), minWidth: "120px" }}
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
                  sx={{ marginRight: theme.spacing( 2), minWidth: "120px" }}
                >
                  Refresh
                </Button>
                {sortBySelect}
              </Box>
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            {filteredStudy.map((study) => (
              <Card
                key={study.study_id}
                sx={{ margin: theme.spacing(2), width: "500px" }}
              >
                <CardActionArea
                  component={Link}
                  to={`${URL_PREFIX}/studies/${study.study_id}/beta`}
                >
                  <CardContent>
                    <Typography variant="h5">
                      {study.study_id} {study.study_name}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      color="text.secondary"
                      component="div"
                    >
                      {"Direction: " +
                        study.directions
                          .map((d) => d.toString().toUpperCase())
                          .join(" ")}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardActions disableSpacing>
                  <Box sx={{ flexGrow: 1 }} />
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
            ))}
          </Box>
        </Container>
      </AppDrawer>
      {renderCreateStudyDialog()}
      {renderDeleteStudyDialog()}
    </Box>
  )
}
