import {
  Box,
  Card,
  CardContent,
  Paper,
  Typography,
  useTheme,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import { DataGrid2 } from "../DataGrid"
import { BestTrialsCard } from "../BestTrialsCard"
import { useStudyDetailValue, useStudySummaryValue } from "../../state"
import { Contour } from "../GraphContour"
import * as Optuna from "@optuna/types"
import React, { FC } from "react"
import { useStudyDetailValue, useStudySummaryValue } from "../../state"
import { BestTrialsCard } from "../BestTrialsCard"
import { DataGrid, DataGridColumn } from "../DataGrid"
import { Contour } from "../GraphContour"

import { ColumnDef, createColumnHelper } from "@tanstack/react-table"

export const PreferentialAnalytics: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const studySummary = useStudySummaryValue(studyId)
  const studyDetail = useStudyDetailValue(studyId)

  const userAttrs = studySummary?.user_attrs || studyDetail?.user_attrs || []
  const columnHelper = createColumnHelper<Trial>()
  const columns: ColumnDef<Attribute>[] = [
    columnHelper.accessor("key", {
      header: "Key",
      footer: (info) => info.column.id,
      enableSorting: true,
    }),
    columnHelper.accessor("value", {
      header: "Value",
      footer: (info) => info.column.id,
      enableSorting: true,
    }),
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
              <DataGrid2 data={userAttrs} columns={columns} />
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>
    </Box>
  )
}
