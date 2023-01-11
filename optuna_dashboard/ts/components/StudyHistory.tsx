import React, { FC } from "react"
import { Box, Card, CardContent, Typography, useTheme } from "@mui/material"
import { GraphParetoFront } from "./GraphParetoFront"
import { GraphHistory } from "./GraphHistory"
import { GraphIntermediateValues } from "./GraphIntermediateValues"
import Grid2 from "@mui/material/Unstable_Grid2"
import { DataGrid, DataGridColumn } from "./DataGrid"
import { GraphHyperparameterImportanceBeta } from "./GraphHyperparameterImportances"
import { BestTrialsCard } from "./BestTrialsCard"
import {
  useStudyDetailValue,
  useStudyDirections,
  useStudySummaryValue,
} from "../state"

export const StudyHistory: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const directions = useStudyDirections(studyId)
  const studySummary = useStudySummaryValue(studyId)
  const studyDetail = useStudyDetailValue(studyId)

  const userAttrs = studySummary?.user_attrs || []
  const userAttrColumns: DataGridColumn<Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
  const trials: Trial[] = studyDetail?.trials || []
  return (
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
          <GraphHistory study={studyDetail} isBeta={true} />
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
}
