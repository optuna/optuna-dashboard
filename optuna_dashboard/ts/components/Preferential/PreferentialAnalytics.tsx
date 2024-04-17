import React, { FC } from "react"
import {
  Box,
  Card,
  CardContent,
  Paper,
  Typography,
  useTheme,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import { DataGrid, DataGridColumn } from "../DataGrid"
import { BestTrialsCard } from "../BestTrialsCard"
import { useStudyDetailValue, useStudySummaryValue } from "../../state"
import { Contour } from "../GraphContour"
import * as Optuna from "@optuna/types"

export const PreferentialAnalytics: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const studySummary = useStudySummaryValue(studyId)
  const studyDetail = useStudyDetailValue(studyId)

  const userAttrs = studySummary?.user_attrs || studyDetail?.user_attrs || []
  const userAttrColumns: DataGridColumn<Optuna.Attribute>[] = [
    { field: "key", label: "Key", sortable: true },
    { field: "value", label: "Value", sortable: true },
  ]
  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
      <Grid2 container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
        <Grid2 xs={14}>
          <Paper elevation={2} sx={{ padding: theme.spacing(2) }}>
            <Contour study={studyDetail} />
          </Paper>
        </Grid2>
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
                sx={{
                  margin: "1em 0",
                  fontWeight: theme.typography.fontWeightBold,
                }}
              >
                Study User Attributes
              </Typography>
              <DataGrid<Optuna.Attribute>
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
