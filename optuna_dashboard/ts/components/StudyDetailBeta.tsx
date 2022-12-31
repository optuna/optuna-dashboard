import React, { FC, useEffect } from "react"
import { useRecoilValue } from "recoil"
import { useParams } from "react-router-dom"
import {
  Card,
  CardContent,
  Box,
  Typography,
  useTheme,
  ListItem,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"

import { GraphHistory } from "./GraphHistory"
import { Note } from "./Note"
import { actionCreator } from "../action"
import {
  reloadIntervalState,
  studyDetailsState,
  studySummariesState,
} from "../state"
import { TrialTable } from "./TrialTable"
import { StudyDetailDrawer } from "./StudyDetailDrawer"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { Contour } from "./GraphContour"
import { GraphHyperparameterImportances } from "./GraphHyperparameterImportances"
import { GraphSlice } from "./GraphSlice"
import { GraphParetoFront } from "./GraphParetoFront"
import { DataGrid, DataGridColumn } from "./DataGrid"
import List from "@mui/material/List"
import { GraphIntermediateValues } from "./GraphIntermediateValues"

interface ParamTypes {
  studyId: string
}

type PageId = "history" | "analytics" | "trials" | "note"

const useStudyDetailValue = (studyId: number): StudyDetail | null => {
  const studyDetails = useRecoilValue<StudyDetails>(studyDetailsState)
  return studyDetails[studyId] || null
}

const useStudySummaryValue = (studyId: number): StudySummary | null => {
  const studySummaries = useRecoilValue<StudySummary[]>(studySummariesState)
  return studySummaries.find((s) => s.study_id == studyId) || null
}

export const StudyDetailBeta: FC<{
  toggleColorMode: () => void
  page: PageId
}> = ({ toggleColorMode, page }) => {
  const theme = useTheme()
  const action = actionCreator()
  const { studyId } = useParams<ParamTypes>()
  const studyIdNumber = parseInt(studyId, 10)
  const studyDetail = useStudyDetailValue(studyIdNumber)
  const reloadInterval = useRecoilValue<number>(reloadIntervalState)
  const studySummary = useStudySummaryValue(studyIdNumber)
  const directions = studyDetail?.directions || studySummary?.directions || null
  const userAttrs = studySummary?.user_attrs || []

  const title =
    studyDetail !== null || studySummary !== null
      ? `${studyDetail?.name || studySummary?.study_name} (id=${studyId})`
      : `Study #${studyId}`

  useEffect(() => {
    action.updateStudyDetail(studyIdNumber)
  }, [])

  useEffect(() => {
    if (reloadInterval < 0 || page === "trials") {
      return
    }
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyIdNumber)
    }, reloadInterval * 1000)
    return () => clearInterval(intervalId)
  }, [reloadInterval, studyDetail, page])

  const userAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
  const trials: Trial[] = studyDetail?.trials || []

  let content = null
  if (page === "history") {
    content = (
      <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <Card
          sx={{
            margin: theme.spacing(2),
          }}
        >
          <CardContent>
            <GraphHistory study={studyDetail} />
          </CardContent>
        </Card>
        {studyDetail !== null &&
        studyDetail.directions.length == 1 &&
        studyDetail.has_intermediate_values ? (
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <GraphIntermediateValues trials={trials} />
            </CardContent>
          </Card>
        ) : null}
        {directions !== null && directions.length > 1 ? (
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <GraphParetoFront study={studyDetail} />
            </CardContent>
          </Card>
        ) : null}
        <Grid2 container spacing={2}>
          <Grid2 xs={6}>
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                {studyDetail !== null &&
                  studyDetail.best_trials.length === 1 && (
                    <>
                      <Typography
                        variant="h6"
                        sx={{ margin: "1em 0", fontWeight: 600 }}
                      >
                        Best Trial
                      </Typography>
                      <Typography
                        variant="h2"
                        sx={{ fontWeight: 600 }}
                        color="secondary"
                      >
                        {studyDetail.best_trials[0].values}
                      </Typography>
                      <List>
                        {studyDetail.best_trials[0].params.map((param) => (
                          <ListItem>
                            {param.name} {param.value}
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                {studyDetail !== null && studyDetail.best_trials.length > 1 && (
                  <>
                    <Typography
                      variant="h6"
                      sx={{ margin: "1em 0", fontWeight: 600 }}
                    >
                      Best Trials
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid2>
          <Grid2 xs={6}>
            <Card sx={{ margin: theme.spacing(2) }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{ margin: "1em 0", fontWeight: 600 }}
                >
                  Study User Attributes
                </Typography>
                <DataGrid<Attribute>
                  columns={userAttrColumns}
                  rows={userAttrs}
                  keyField={"key"}
                  dense={true}
                  initialRowsPerPage={5}
                  rowsPerPageOption={[5, 10, { label: "All", value: -1 }]}
                />
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>
      </Box>
    )
  } else if (page === "analytics") {
    content = (
      <Box sx={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Hyperparameter Importance
        </Typography>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphHyperparameterImportances
              study={studyDetail}
              studyId={studyIdNumber}
            />
          </CardContent>
        </Card>
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Hyperparameter Relationships
        </Typography>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphSlice study={studyDetail} />
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <GraphParallelCoordinate study={studyDetail} />
          </CardContent>
        </Card>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Contour study={studyDetail} />
          </CardContent>
        </Card>
      </Box>
    )
  } else if (page === "trials") {
    content = (
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <TrialTable studyDetail={studyDetail} />
        </CardContent>
      </Card>
    )
  } else if (page === "note") {
    content =
      studyDetail !== null ? (
        <Note
          studyId={studyIdNumber}
          latestNote={studyDetail.note}
          minRows={30}
        />
      ) : null
  }

  return (
    <Box sx={{ display: "flex" }}>
      <StudyDetailDrawer
        studyId={studyIdNumber}
        page={page}
        toggleColorMode={toggleColorMode}
        title={title}
      >
        {content}
      </StudyDetailDrawer>
    </Box>
  )
}
