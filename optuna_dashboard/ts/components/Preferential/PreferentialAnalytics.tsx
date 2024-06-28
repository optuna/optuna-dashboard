import {
  Box,
  Card,
  CardContent,
  Paper,
  Typography,
  useTheme,
} from "@mui/material"
import Grid from "@mui/material/Grid"
import * as Optuna from "@optuna/types"
import React, { FC } from "react"
import { useStudyDetailValue, useStudySummaryValue } from "../../state"
import { BestTrialsCard } from "../BestTrialsCard"
import { DataGrid } from "../DataGrid"
import { Contour } from "../GraphContour"

import { ColumnDef, createColumnHelper } from "@tanstack/react-table"

export const PreferentialAnalytics: FC<{ studyId: number }> = ({ studyId }) => {
  const theme = useTheme()
  const studySummary = useStudySummaryValue(studyId)
  const studyDetail = useStudyDetailValue(studyId)

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
  return (
    <Box
      component="div"
      sx={{ display: "flex", width: "100%", flexDirection: "column" }}
    >
      <Grid container spacing={2} sx={{ padding: theme.spacing(0, 2) }}>
        <Grid item xs={14}>
          <Paper elevation={2} sx={{ padding: theme.spacing(2) }}>
            <Contour study={studyDetail} />
          </Paper>
        </Grid>
        <Grid item xs={6} spacing={2}>
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
      </Grid>
    </Box>
  )
}
