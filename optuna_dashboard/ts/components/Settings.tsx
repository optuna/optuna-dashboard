import React, { useState } from "react"

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

import { useRecoilValue, useSetRecoilState } from "recoil"
import { plotlyColorTheme } from "../state"

interface SettingsProps {
  handleClose: () => void
}

export const Settings = ({ handleClose }: SettingsProps) => {
  const theme = useTheme()
  const colorTheme = useRecoilValue<PlotlyColorTheme>(plotlyColorTheme)
  const setPlotlyColorTheme = useSetRecoilState(plotlyColorTheme)

  const [darkModeColor, setDarkModeColor] = useState(colorTheme.dark)
  const [lightModeColor, setLightModeColor] = useState(colorTheme.light)

  const handleDarkModeColorChange = (event: SelectChangeEvent) => {
    setDarkModeColor(event.target.value)
    setPlotlyColorTheme({ dark: event.target.value, light: lightModeColor })
  }

  const handleLightModeColorChange = (event: SelectChangeEvent) => {
    setLightModeColor(event.target.value)
    setPlotlyColorTheme({ dark: darkModeColor, light: event.target.value })
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
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Dark Mode</Typography>
          <Select
            disabled
            value={darkModeColor}
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

        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Light Mode</Typography>
          <Select value={lightModeColor} onChange={handleLightModeColorChange}>
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
      </Stack>
    </Stack>
  )
}
