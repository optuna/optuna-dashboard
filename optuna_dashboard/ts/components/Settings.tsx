import React from "react"
import {
  Typography,
  Select,
  Switch,
  MenuItem,
  SelectChangeEvent,
  Stack,
  useTheme,
  IconButton,
  Box,
} from "@mui/material"
import ClearIcon from "@mui/icons-material/Clear"
import { useRecoilState } from "recoil"
import { plotBackendRenderingState, usePlotlyColorThemeState } from "../state"

interface SettingsProps {
  handleClose: () => void
}

export const Settings = ({ handleClose }: SettingsProps) => {
  const theme = useTheme()
  const [plotlyColorTheme, setPlotlyColorTheme] = usePlotlyColorThemeState()
  const [plotBackendRendering, setPlotBackendRendering] = useRecoilState(
    plotBackendRenderingState
  )

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
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6">Dark Mode</Typography>
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
              </Stack>
              <Typography color="textSecondary">
                Only the "Default" color scale is supported in dark mode
              </Typography>
            </>
          ) : (
            <Stack direction="row" spacing={2} alignItems="center">
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
            </Stack>
          )}
        </Stack>

        <Stack>
          <Typography
            variant="h5"
            sx={{ fontWeight: theme.typography.fontWeightBold }}
          >
            Use Plotlypy
          </Typography>
          <Switch
            checked={plotBackendRendering}
            onChange={togglePlotBackendRendering}
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
