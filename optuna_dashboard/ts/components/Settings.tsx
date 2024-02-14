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
} from "@mui/material"
import ClearIcon from "@mui/icons-material/Clear"
import { useRecoilState } from "recoil"
import { plotlyColorThemeState, plotBackendRenderingState } from "../state"

interface SettingsProps {
  handleClose: () => void
}

export const Settings = ({ handleClose }: SettingsProps) => {
  const theme = useTheme()
  const [plotlyColorTheme, setPlotlyColorTheme] = useRecoilState(
    plotlyColorThemeState
  )

  const handleDarkModeColorChange = (event: SelectChangeEvent) => {
    const dark = event.target.value as PlotlyColorThemeDark
    setPlotlyColorTheme((prev) => ({ ...prev, dark }))
  }

  const handleLightModeColorChange = (event: SelectChangeEvent) => {
    const light = event.target.value as PlotlyColorThemeLight
    setPlotlyColorTheme((prev) => ({ ...prev, light }))
  }

  const [plotBackendRendering, setPlotBackendRendering] =
    useRecoilState<boolean>(plotBackendRenderingState)
  const handleBackendRenderingChange = () => {
    setPlotBackendRendering(!plotBackendRendering)
  }

  return (
    <Stack
      spacing={4}
      sx={{
        position: "relative",
        p: "2rem",
      }}
    >
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
        
        <Typography variant="h6" color="textSecondary">
          Use Plotlypy
        </Typography>
        <Switch
          checked={plotBackendRendering}
          onChange={handleBackendRenderingChange}
          value="enable"
        />
      </Stack>
    </Stack>
  )
}
