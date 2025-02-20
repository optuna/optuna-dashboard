import React, { FC, useEffect, useMemo, useState } from "react";
import { useRecoilValue } from "recoil";
import { useSnackbar } from "notistack";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  FormControl,
  Switch,
  Typography,
  Box,
  useTheme,
  IconButton,
} from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import HomeIcon from "@mui/icons-material/Home";

import { actionCreator } from "../action";
import { studySummariesState, studyDetailsState } from "../state";
import { AppDrawer } from "./AppDrawer";
import { GraphEdf } from "./GraphEdf";
import { GraphHistory } from "./GraphHistory";
import { useNavigate, useLocation } from "react-router-dom";

const useQuery = (): URLSearchParams => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const useQueriedStudies = (studies: StudySummary[], query: URLSearchParams): StudySummary[] => {
  return useMemo(() => {
    const queried = query.get("ids");
    if (queried === null) {
      return [];
    }
    const ids = queried
      .split(",")
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n));
    return studies.filter((t) => ids.findIndex((n) => n === t.study_id) !== -1);
  }, [studies, query]);
};

const getStudyListLink = (ids: number[]): string => {
  const base = import.meta.env.VITE_URL_PREFIX + "/compare-studies";
  if (ids.length > 0) {
    return base + "?ids=" + ids.map((n) => n.toString()).join(",");
  }
  return base;
};

const isEqualDirections = (array1: StudyDirection[], array2: StudyDirection[]): boolean => {
  let i = array1.length;
  if (i !== array2.length) return false;

  while (i--) {
    if (array1[i] !== array2[i]) return false;
  }
  return true;
};

export const CompareStudies: FC<{
  toggleColorMode: () => void;
}> = ({ toggleColorMode }) => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const query = useQuery();
  const navigate = useNavigate();

  const action = actionCreator();
  const studies = useRecoilValue<StudySummary[]>(studySummariesState);
  const queried = useQueriedStudies(studies, query);
  const selected = useMemo(() => {
    return queried.length > 0 ? queried : studies.length > 0 ? [studies[0]] : [];
  }, [studies, query]);

  const studyListWidth = 200;
  const title = "Compare Studies (Experimental)";

  useEffect(() => {
    action.updateStudySummaries();
  }, []);

  const toolbar = (
    <>
      <IconButton
        component={Link}
        to={import.meta.env.VITE_URL_PREFIX + "/"}
        sx={{ marginRight: theme.spacing(1) }}
        color="inherit"
        title="Return to the top page"
      >
        <HomeIcon />
      </IconButton>
      <ChevronRightIcon sx={{ marginRight: theme.spacing(1) }} />
      <Typography noWrap component="div" sx={{ fontWeight: theme.typography.fontWeightBold }}>
        {title}
      </Typography>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppDrawer toggleColorMode={toggleColorMode} toolbar={toolbar}>
        <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
          <Box
            sx={{
              minWidth: studyListWidth,
              overflow: "auto",
              height: `calc(100vh - ${theme.spacing(8)})`,
            }}
          >
            <List>
              <ListSubheader sx={{ display: "flex", flexDirection: "row" }}>
                <Typography sx={{ p: theme.spacing(1, 0) }}>
                  Compare studies with Shift+Click
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
              </ListSubheader>
              <Divider />
              {studies.map((study) => {
                return (
                  <ListItem key={study.study_id} disablePadding>
                    <ListItemButton
                      onClick={(e) => {
                        if (e.shiftKey) {
                          let next: number[];
                          const selectedIds = selected.map((s) => s.study_id);
                          const alreadySelected =
                            selectedIds.findIndex((n) => n === study.study_id) >= 0;
                          if (alreadySelected) {
                            next = selectedIds.filter((n) => n !== study.study_id);
                          } else {
                            if (
                              selected.length > 0 &&
                              selected[0].directions.length !== study.directions.length
                            ) {
                              enqueueSnackbar(
                                "You can only compare studies that has the same number of objectives.",
                                {
                                  variant: "info",
                                }
                              );
                              next = selectedIds;
                            } else if (
                              selected.length > 0 &&
                              !isEqualDirections(selected[0].directions, study.directions)
                            ) {
                              enqueueSnackbar(
                                "You can only compare studies that has the same directions.",
                                {
                                  variant: "info",
                                }
                              );
                              next = selectedIds;
                            } else {
                              next = [...selectedIds, study.study_id];
                            }
                          }
                          navigate(getStudyListLink(next));
                        } else {
                          navigate(getStudyListLink([study.study_id]));
                        }
                      }}
                      selected={selected.findIndex((s) => s.study_id === study.study_id) !== -1}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <ListItemText primary={`${study.study_id}. ${study.study_name}`} />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          width: "100%",
                        }}
                      >
                        <Chip
                          color="primary"
                          label={
                            study.directions.length === 1
                              ? `${study.directions.length} objective`
                              : `${study.directions.length} objectives`
                          }
                          size="small"
                          variant="outlined"
                        />
                        <span style={{ margin: theme.spacing(0.5) }} />
                        <Chip
                          color="secondary"
                          label={study.directions
                            .map((d) => (d === "maximize" ? "max" : "min"))
                            .join(", ")}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box
            sx={{
              flexGrow: 1,
              overflow: "auto",
              height: `calc(100vh - ${theme.spacing(8)})`,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "row", width: "100%" }}>
              <StudiesGraph studies={selected} />
            </Box>
          </Box>
        </Box>
      </AppDrawer>
    </Box>
  );
};

const StudiesGraph: FC<{ studies: StudySummary[] }> = ({ studies }) => {
  const theme = useTheme();
  const action = actionCreator();
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState);
  const [logScale, setLogScale] = useState<boolean>(false);
  const [includePruned, setIncludePruned] = useState<boolean>(true);

  const handleLogScaleChange = () => {
    setLogScale(!logScale);
  };

  const handleIncludePrunedChange = () => {
    setIncludePruned(!includePruned);
  };

  useEffect(() => {
    studies.forEach((study) => {
      action.updateStudyDetail(study.study_id);
    });
  }, [studies]);

  const showStudyDetails = studies.map((study) => studyDetails[study.study_id]);

  return (
    <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
      <FormControl
        component="fieldset"
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: theme.spacing(2),
        }}
      >
        <FormControlLabel
          control={<Switch checked={logScale} onChange={handleLogScaleChange} value="enable" />}
          label="Log y scale"
        />
        <FormControlLabel
          control={
            <Switch checked={includePruned} onChange={handleIncludePrunedChange} value="enable" />
          }
          label="Include PRUNED trials"
        />
      </FormControl>
      {showStudyDetails !== null &&
      showStudyDetails.length > 0 &&
      showStudyDetails.every((s) => s) ? (
        <Card
          sx={{
            margin: theme.spacing(2),
          }}
        >
          <CardContent>
            <GraphHistory
              studies={showStudyDetails}
              includePruned={includePruned}
              logScale={logScale}
            />
          </CardContent>
        </Card>
      ) : null}
      <Grid2 container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
        {showStudyDetails !== null &&
        showStudyDetails.length > 0 &&
        showStudyDetails.every((s) => s)
          ? showStudyDetails[0].directions.map((d, i) => (
              <Grid2 xs={6} key={i}>
                <Card>
                  <CardContent>
                    <GraphEdf studies={showStudyDetails} objectiveId={i} />
                  </CardContent>
                </Card>
              </Grid2>
            ))
          : null}
      </Grid2>
    </Box>
  );
};
