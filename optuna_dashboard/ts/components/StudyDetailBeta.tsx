import React, { FC, useEffect, useMemo } from "react"
import { useRecoilValue } from "recoil"
import { Link, useParams } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  IconButton,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import HomeIcon from "@mui/icons-material/Home"

import { GraphHistory } from "./GraphHistory"
import { StudyNote } from "./Note"
import { actionCreator } from "../action"
import {
  reloadIntervalState,
  useStudyDetailValue,
  useStudyDirections,
  useStudyName,
  useStudySummaryValue,
} from "../state"
import { TrialTable } from "./TrialTable"
import { AppDrawer } from "./AppDrawer"
import { GraphParallelCoordinate } from "./GraphParallelCoordinate"
import { Contour } from "./GraphContour"
import { GraphHyperparameterImportanceBeta } from "./GraphHyperparameterImportances"
import { GraphSlice } from "./GraphSlice"
import { GraphParetoFront } from "./GraphParetoFront"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { Edf } from "./GraphEdf"
import { TrialList } from "./TrialList"
import { BestTrialsCard } from "./BestTrialsCard"

interface ParamTypes {
  studyId: string
}

export const useURLVars = (): number => {
  const { studyId } = useParams<ParamTypes>()

  return useMemo(() => parseInt(studyId, 10), [studyId])
}

export const StudyDetailBeta: FC<{
  toggleColorMode: () => void
  page: PageId
}> = ({ toggleColorMode, page }) => {
  const theme = useTheme()
  const action = actionCreator()
  const studyId = useURLVars()
  const studyDetail = useStudyDetailValue(studyId)
  const reloadInterval = useRecoilValue<number>(reloadIntervalState)
  const studySummary = useStudySummaryValue(studyId)
  const directions = useStudyDirections(studyId)
  const studyName = useStudyName(studyId)
  const userAttrs = studySummary?.user_attrs || []

  const title =
    studyName !== null ? `${studyName} (id=${studyId})` : `Study #${studyId}`

  useEffect(() => {
    action.updateStudyDetail(studyId)
  }, [])

  useEffect(() => {
    if (reloadInterval < 0 || page === "trialTable" || page === "trialList") {
      return
    }
    const intervalId = setInterval(function () {
      action.updateStudyDetail(studyId)
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
        {directions !== null && directions.length > 1 ? (
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <GraphParetoFront study={studyDetail} />
            </CardContent>
          </Card>
        ) : null}
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
        <Grid2 container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
          <GraphHyperparameterImportanceBeta
            studyId={studyId}
            study={studyDetail}
            graphHeight="450px"
          />
          <Grid2 xs={6} spacing={2}>
            <BestTrialsCard studyDetail={studyDetail} />
          </Grid2>
          <Grid2 xs={6}>
            <Card>
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
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
        <Typography variant="h5" sx={{ margin: theme.spacing(2) }}>
          Empirical Distribution of the Objective Value
        </Typography>
        <Card sx={{ margin: theme.spacing(2) }}>
          <CardContent>
            <Edf study={studyDetail} />
          </CardContent>
        </Card>
      </Box>
    )
  } else if (page === "trialTable") {
    content = (
      <Card sx={{ margin: theme.spacing(2) }}>
        <CardContent>
          <TrialTable
            studyDetail={studyDetail}
            isBeta={true}
            initialRowsPerPage={50}
          />
        </CardContent>
      </Card>
    )
  } else if (page === "trialList") {
    content = <TrialList studyDetail={studyDetail} />
  } else if (page === "note" && studyDetail !== null) {
    content = (
      <StudyNote
        studyId={studyId}
        latestNote={studyDetail.note}
        cardSx={{ height: "90vh" }}
      />
    )
  }

  const toolbar = (
    <>
      <IconButton
        component={Link}
        to={URL_PREFIX + "/beta"}
        sx={{ marginRight: theme.spacing(1) }}
        color="inherit"
        title="Return to the top page"
      >
        <HomeIcon />
      </IconButton>
      <ChevronRightIcon sx={{ marginRight: theme.spacing(1) }} />
      <Typography variant="h5" noWrap component="div">
        {title}
      </Typography>
    </>
  )

  return (
    <Box sx={{ display: "flex" }}>
      <AppDrawer
        studyId={studyId}
        page={page}
        toggleColorMode={toggleColorMode}
        toolbar={toolbar}
      >
        {content}
      </AppDrawer>
    </Box>
  )
}
