import ClearIcon from "@mui/icons-material/Clear"
import {
  Box,
  IconButton,
  Link,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Typography,
  useTheme,
} from "@mui/material"
import React from "react"
import { usePlotlyPyIsAvailable } from "../hooks/useAPIMeta"
import {
  usePlotBackendRendering,
  usePlotlyColorThemeState,
  useShowExperimentalFeature,
} from "../state"
import { PlotlyColorThemeDark, PlotlyColorThemeLight } from "../types/optuna"

interface SettingsProps {
  handleClose: () => void
}

export const Settings = ({ handleClose }: SettingsProps) => {
  const theme = useTheme()
  const [plotlyColorTheme, setPlotlyColorTheme] = usePlotlyColorThemeState()
  const [plotBackendRendering, setPlotBackendRendering] =
    usePlotBackendRendering()
  const plotlypyIsAvailable = usePlotlyPyIsAvailable()
  const [showExperimentalFeature, setShowExperimentalFeature] =
    useShowExperimentalFeature()

  const handleDarkModeColorChange = (event: SelectChangeEvent) => {
    const dark = event.target.value as PlotlyColorThemeDark
    setPlotlyColorTheme((cur) => ({ ...cur, dark }))
  }

  const handleLightModeColorChange = (event: SelectChangeEvent) => {
    const light = event.target.value as PlotlyColorThemeLight
    setPlotlyColorTheme((cur) => ({ ...cur, light }))
  }

  const togglePlotBackendRendering = () => {
    setPlotBackendRendering((cur) => !cur)
  }

  const toggleShowExperimentalFeature = () => {
    setShowExperimentalFeature((cur) => !cur)
  }

  return (
    <Box component="div" sx={{ position: "relative" }}>
      <Stack
        spacing={4}
        sx={{
          p: "2rem",
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: theme.typography.fontWeightBold }}
        >
          Settings
        </Typography>

        <Stack spacing={2}>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Plotly Color Scales
          </Typography>
          {theme.palette.mode === "dark" ? (
            <>
              <Typography variant="h6">Dark Mode</Typography>
              <Typography color="textSecondary">
                Only the "Default" color scale is supported in dark mode
              </Typography>
              <Select
                disabled
                value={plotlyColorTheme.dark}
                onChange={handleDarkModeColorChange}
              >
                {(
                  [{ value: "default", label: "Default" }] as {
                    value: PlotlyColorThemeDark
                    label: string
                  }[]
                ).map((v) => (
                  <MenuItem key={v.value} value={v.value}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Typography variant="h6">Light Mode</Typography>
              <Select
                value={plotlyColorTheme.light}
                onChange={handleLightModeColorChange}
              >
                {(
                  [
                    { value: "default", label: "Default" },
                    { value: "seaborn", label: "Seaborn" },
                    { value: "presentation", label: "Presentation" },
                    { value: "ggplot2", label: "GGPlot2" },
                  ] as {
                    value: PlotlyColorThemeLight
                    label: string
                  }[]
                ).map((v) => (
                  <MenuItem key={v.value} value={v.value}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
        </Stack>

        <Stack>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Use Plotly Python library
          </Typography>
          <Typography color="textSecondary">
            {"If enabled, the plots will be rendered using the "}
            <Link href="https://optuna.readthedocs.io/en/stable/reference/visualization/index.html">
              optuna.visualization module
            </Link>
            .
          </Typography>
          <Switch
            checked={plotBackendRendering}
            onChange={togglePlotBackendRendering}
            value="enable"
            disabled={!plotlypyIsAvailable}
          />
        </Stack>

        <Stack>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Show Experimental Feature
          </Typography>
          <Typography color="textSecondary">
            {
              'If enabled, show experimental features "Trial (Selection)" in the UI.'
            }
          </Typography>
          <Switch
            checked={showExperimentalFeature}
            onChange={toggleShowExperimentalFeature}
            value="enable"
          />
        </Stack>
      </Stack>

      <IconButton
        sx={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          width: "2rem",
          height: "2rem",
        }}
        onClick={handleClose}
      >
        <ClearIcon />
      </IconButton>
    </Box>
  )
}
