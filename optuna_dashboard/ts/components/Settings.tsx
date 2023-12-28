import React, { FC, useState } from "react"

import {
  Typography,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
} from "@mui/material"

import { useRecoilValue, useSetRecoilState } from "recoil"
import { plotlyColorTheme } from "../state"

export const Settings: FC = () => {
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
    <Grid container spacing={4} sx={{ padding: "40px" }}>
      <Grid item xs={12}>
        <Typography variant="h3" gutterBottom color="textSecondary">
          Settings
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom color="textPrimary">
          Plotly Color Scales
        </Typography>
      </Grid>

      <Grid item xs={2}>
        <Typography variant="h6" color="textSecondary">
          Dark Mode
        </Typography>
      </Grid>
      <Grid item xs={10} sx={{ display: "flex", alignItems: "center" }}>
        <Select value={darkModeColor} onChange={handleDarkModeColorChange}>
          <MenuItem value={"default"}>Default</MenuItem>
          <MenuItem value={"seaborn"}>Seaborn</MenuItem>
          <MenuItem value={"presentation"}>Presentation</MenuItem>
          <MenuItem value={"ggplot2"}>GGPlot2</MenuItem>
        </Select>
      </Grid>

      <Grid item xs={2}>
        <Typography variant="h6" color="textSecondary">
          Light Mode
        </Typography>
      </Grid>
      <Grid item xs={10} sx={{ display: "flex", alignItems: "center" }}>
        <Select value={lightModeColor} onChange={handleLightModeColorChange}>
          <MenuItem value={"default"}>Default</MenuItem>
          <MenuItem value={"seaborn"}>Seaborn</MenuItem>
          <MenuItem value={"presentation"}>Presentation</MenuItem>
          <MenuItem value={"ggplot2"}>GGPlot2</MenuItem>
        </Select>
      </Grid>
    </Grid>
  )
}
