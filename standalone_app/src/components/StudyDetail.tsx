import { Home } from "@mui/icons-material"
import Brightness4Icon from "@mui/icons-material/Brightness4"
import Brightness7Icon from "@mui/icons-material/Brightness7"
import {
  AppBar,
  Box,
  Card,
  CardContent,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2"
import {
  PlotHistory,
  PlotImportance,
  PlotIntermediateValues,
  TrialTable,
} from "@optuna/react"
import * as Optuna from "@optuna/types"
import init, { wasm_fanova_calculate } from "optuna"
import React, { FC, useContext, useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { StorageContext } from "./StorageProvider"

export const StudyDetail: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const { idx } = useParams<{ idx: string }>()
  const idxNumber = parseInt(idx || "", 10)

  const { storage } = useContext(StorageContext)
  const [study, setStudy] = useState<Optuna.Study | null>(null)
  useEffect(() => {
    const fetchStudy = async () => {
      if (storage === null) {
        return
      }
      const study = await storage.getStudy(idxNumber)
      setStudy(study)
    }
    fetchStudy()
  }, [storage, idxNumber])

  const [importance, setImportance] = useState<Optuna.ParamImportance[][]>([])
  const filterFunc = (trial: Optuna.Trial, objectiveId: number): boolean => {
    if (trial.state !== "Complete" && trial.state !== "Pruned") {
      return false
    }
    if (trial.values === undefined) {
      return false
    }
    return (
      trial.values.length > objectiveId &&
      trial.values[objectiveId] !== Infinity &&
      trial.values[objectiveId] !== -Infinity
    )
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    async function run_wasm() {
      if (study === null) {
        return
      }

      await init()

      const x: Optuna.ParamImportance[][] = study.directions.map(
        (_d, objectiveId) => {
          const filteredTrials = study.trials.filter((t) =>
            filterFunc(t, objectiveId)
          )
          if (filteredTrials.length === 0) {
            return study.union_search_space.map((s) => {
              return {
                name: s.name,
                importance: 0.5,
              }
            })
          }

          const features = study.intersection_search_space.map((s) =>
            filteredTrials
              .map(
                (t) =>
                  t.params.find((p) => p.name === s.name) as Optuna.TrialParam
              )
              .map((p) => p.param_internal_value)
          )
          const values = filteredTrials.map(
            (t) => t.values?.[objectiveId] as number
          )
          // TODO: handle errors thrown by wasm_fanova_calculate
          const importance = wasm_fanova_calculate(features, values)
          return study.intersection_search_space.map((s, i) => ({
            name: s.name,
            importance: importance[i],
          }))
        }
      )
      setImportance(x)
    }

    run_wasm()
  }, [study])

  return (
    <>
      <AppBar position="static">
        <Container
          sx={{
            "@media (min-width: 1280px)": {
              maxWidth: "100%",
            },
          }}
        >
          <Toolbar>
            <Typography variant="h6">Optuna Dashboard</Typography>
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
            <IconButton
              aria-controls="menu-appbar"
              aria-haspopup="true"
              component={Link}
              to={"/"}
              color="inherit"
              title="Return to the top"
            >
              <Home />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        sx={{
          "@media (min-width: 1280px)": {
            maxWidth: "100%",
          },
        }}
      >
        <>
          <Typography
            variant="h4"
            sx={{
              margin: `${theme.spacing(4)} ${theme.spacing(2)}`,
              fontWeight: theme.typography.fontWeightBold,
              fontSize: "1.8rem",
              ...(theme.palette.mode === "dark" && {
                color: theme.palette.primary.light,
              }),
            }}
          >
            {study?.study_name || "Not Found"}
          </Typography>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              <PlotHistory study={study} />
            </CardContent>
          </Card>
          <Grid2 container spacing={0}>
            <Grid2 xs={6}>
              <Card sx={{ margin: theme.spacing(2) }}>
                <CardContent>
                  {!!study && (
                    <PlotImportance study={study} importance={importance} />
                  )}
                </CardContent>
              </Card>
            </Grid2>
            <Grid2 xs={6}>
              <Card sx={{ margin: theme.spacing(2) }}>
                <CardContent>
                  {!!study && (
                    <PlotIntermediateValues
                      trials={study.trials}
                      includePruned={false}
                      logScale={false}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid2>
          </Grid2>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              {!!study && <TrialTable study={study} initialRowsPerPage={10} />}
            </CardContent>
          </Card>
        </>
      </Container>
    </>
  )
}
