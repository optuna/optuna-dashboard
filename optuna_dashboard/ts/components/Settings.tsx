import React from "react"
import {
  Typography,
  Select,
  MenuItem,
  SelectChangeEvent,
  Stack,
  useTheme,
  IconButton,
} from "@mui/material"
import ClearIcon from "@mui/icons-material/Clear"
import { useRecoilState } from "recoil"
import { plotlyColorThemeState } from "../state"

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
        sx={{ fontWeight: theme.typography.fontWeightBold, marginTop: 0 }}
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
                <MenuItem value={"default" as PlotlyColorThemeDark}>
                  Default
                </MenuItem>
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
              <MenuItem value={"default" as PlotlyColorThemeLight}>
                Default
              </MenuItem>
              <MenuItem value={"seaborn" as PlotlyColorThemeLight}>
                Seaborn
              </MenuItem>
              <MenuItem value={"presentation" as PlotlyColorThemeLight}>
                Presentation
              </MenuItem>
              <MenuItem value={"ggplot2" as PlotlyColorThemeLight}>
                GGPlot2
              </MenuItem>
            </Select>
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
