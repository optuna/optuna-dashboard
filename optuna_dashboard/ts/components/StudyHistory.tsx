import {
  Box,
  Card,
  CardContent,
  FormControl,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import FormControlLabel from "@mui/material/FormControlLabel"
import Grid from "@mui/material/Grid"
import * as Optuna from "@optuna/types"
import React, { FC, useState } from "react"
import { useRecoilValue } from "recoil"
import { Trial } from "ts/types/optuna"
import {
  useStudyDetailValue,
  useStudyDirections,
  useStudySummaryValue,
} from "../state"
import { artifactIsAvailable } from "../state"
import { StudyArtifactCards } from "./Artifact/StudyArtifactCards"
import { BestTrialsCard } from "./BestTrialsCard"
import { DataGrid } from "./DataGrid"
import { GraphHistory } from "./GraphHistory"
import { GraphHyperparameterImportance } from "./GraphHyperparameterImportances"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import { GraphParetoFront } from "./GraphParetoFront"
import { GraphTimeline } from "./GraphTimeline"
import { UserDefinedPlot } from "./UserDefinedPlot"

import { ColumnDef, createColumnHelper } from "@tanstack/react-table"

export const StudyHistory: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const directions = useStudyDirections(studyId)
  const studySummary = useStudySummaryValue(studyId)
  const studyDetail = useStudyDetailValue(studyId)
  const [logScale, setLogScale] = useState<boolean>(false)
  const [includePruned, setIncludePruned] = useState<boolean>(true)
  const artifactEnabled = useRecoilValue<boolean>(artifactIsAvailable)

  const handleLogScaleChange = () => {
    setLogScale(!logScale)
  }

  const handleIncludePrunedChange = () => {
    setIncludePruned(!includePruned)
  }

  const userAttrs = studySummary?.user_attrs || studyDetail?.user_attrs || []
  const columnHelper = createColumnHelper<Optuna.Attribute>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: ColumnDef<Optuna.Attribute, any>[] = [
    columnHelper.accessor("key", {
      header: "Key",
      enableSorting: true,
      enableColumnFilter: false,
    }),
    columnHelper.accessor("value", {
      header: "Value",
      enableSorting: true,
      enableColumnFilter: false,
    }),
  ]
  const trials: Trial[] = studyDetail?.trials || []
  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
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
          control={
            <Switch
              checked={logScale}
              onChange={handleLogScaleChange}
              value="enable"
            />
          }
          label="Log y scale"
        />
        <FormControlLabel
          control={
            <Switch
              checked={
                studyDetail
                  ? studyDetail.has_intermediate_values && includePruned
                  : false
              }
              onChange={handleIncludePrunedChange}
              disabled={!studyDetail?.has_intermediate_values}
              value="enable"
            />
          }
          label="Include PRUNED trials"
        />
      </FormControl>
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
          <GraphHistory
            studies={studyDetail !== null ? [studyDetail] : []}
            includePruned={includePruned}
            logScale={logScale}
          />
        </CardContent>
      </Card>
      <Grid container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
        <Grid item xs={6}>
          <GraphHyperparameterImportance
            studyId={studyId}
            study={studyDetail}
            graphHeight="450px"
          />
        </Grid>
        <Grid item xs={6}>
          <GraphTimeline study={studyDetail} />
        </Grid>
        {studyDetail !== null &&
          studyDetail.plotly_graph_objects.map((go) => (
            <Grid xs={6} key={go.id}>
              <Card>
                <CardContent>
                  <UserDefinedPlot graphObject={go} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        <Grid item container xs={6} spacing={2}>
          <BestTrialsCard studyDetail={studyDetail} />
        </Grid>
        <Grid item xs={6}>
          <Card>
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  margin: "1em 0",
                  fontWeight: theme.typography.fontWeightBold,
                }}
              >
                Study User Attributes
              </Typography>
              <DataGrid data={userAttrs} columns={columns} />
            </CardContent>
          </Card>
        </Grid>
        {studyDetail !== null &&
        studyDetail.directions.length === 1 &&
        studyDetail.has_intermediate_values ? (
          <Grid xs={6}>
            <GraphIntermediateValues
              trials={trials}
              includePruned={includePruned}
              logScale={logScale}
            />
          </Grid>
        ) : null}
      </Grid>

      {artifactEnabled && studyDetail !== null && (
        <Grid container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
          <Grid item xs={6}>
            <Card>
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    margin: "1em 0",
                    fontWeight: theme.typography.fontWeightBold,
                  }}
                >
                  Study Artifacts
                </Typography>
                <StudyArtifactCards study={studyDetail} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
