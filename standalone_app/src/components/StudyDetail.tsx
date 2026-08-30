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
import Grid from "@mui/material/Grid"
import {
  PlotHistory,
  PlotImportance,
  PlotIntermediateValues,
  TrialTable,
} from "@optuna/react"
import * as Optuna from "@optuna/types"
import init, { wasm_fanova_calculate } from "optuna"
import { FC, useContext, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { StorageContext } from "./StorageProvider"

export const StudyDetail: FC<{
  toggleColorMode: () => void
}> = ({ toggleColorMode }) => {
  const theme = useTheme()
  const { studyId } = useParams<{ studyId: string }>()
  const studyIdNumber = Number(studyId)

  const { storage, reportError } = useContext(StorageContext)
  const [study, setStudy] = useState<Optuna.Study | null>(null)
  useEffect(() => {
    let active = true
    const fetchStudy = async () => {
      if (storage === null) {
        return
      }
      try {
        const study = await storage.getStudy(studyIdNumber)
        if (active) {
          setStudy(study)
        }
      } catch (error) {
        if (active) {
          reportError(error)
        }
      }
    }
    void fetchStudy()
    return () => {
      active = false
    }
  }, [reportError, storage, studyIdNumber])

  const [importance, setImportance] = useState<Optuna.ParamImportance[][]>([])
  const filterFunc = (trial: Optuna.Trial, objectiveId: number): boolean => {
    if (trial.state !== "Complete" && trial.state !== "Pruned") {
      return false
    }
    if (trial.values === undefined) {
      return false
    }
    // fANOVA has no variance to attribute to a non-finite objective, so such a
    // trial is skipped here rather than rejected by the WASM module later. NaN
    // used to slip through the two Infinity comparisons this replaces.
    return (
      trial.values.length > objectiveId &&
      Number.isFinite(trial.values[objectiveId])
    )
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    let active = true

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
            filteredTrials.map((t) => {
              const param = t.params.find((p) => p.name === s.name)
              if (param === undefined) {
                // The intersection search space should guarantee this, so a
                // miss means the study is inconsistent: say so instead of
                // reading param_internal_value off undefined.
                throw new Error(
                  `Trial ${t.number} has no value for the parameter "${s.name}"`
                )
              }
              return param.param_internal_value
            })
          )
          const values = filteredTrials.map(
            (t) => t.values?.[objectiveId] as number
          )
          const importance = wasm_fanova_calculate(features, values)
          return study.intersection_search_space.map((s, i) => ({
            name: s.name,
            importance: importance[i],
          }))
        }
      )
      if (active) {
        setImportance(x)
      }
    }

    // init() rejects when the WASM module cannot be loaded, and
    // wasm_fanova_calculate() throws when the module rejects the trials it was
    // given. Neither was handled, so a failure left the panel empty with the
    // reason visible only in the console.
    run_wasm().catch((e: unknown) => {
      if (!active) {
        return
      }
      setImportance([])
      reportError(
        new Error(
          `Failed to calculate hyperparameter importance: ${
            e instanceof Error ? e.message : String(e)
          }`
        )
      )
    })

    return () => {
      active = false
    }
  }, [study, reportError])

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
            {study?.name || "Not Found"}
          </Typography>
          <Card sx={{ margin: theme.spacing(2) }}>
            <CardContent>
              {!!study && <PlotHistory studies={[study]} />}
            </CardContent>
          </Card>
          <Grid container spacing={0}>
            <Grid item xs={6}>
              <Card sx={{ margin: theme.spacing(2) }}>
                <CardContent>
                  <PlotImportance study={study} importance={importance} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
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
            </Grid>
          </Grid>
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
