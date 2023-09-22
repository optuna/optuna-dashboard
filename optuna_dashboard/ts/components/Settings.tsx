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
    <Grid container spacing={2} style={{ padding: "40px" }}>
      <Grid item xs={12}>
        <Typography variant="h3">Settings</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h5">Plotly Color Scales</Typography>
      </Grid>
      <Grid item xs={2}>
        <Typography variant="h5">Dark Mode</Typography>
      </Grid>
      <Grid item xs={10}>
        <Select value={darkModeColor} onChange={handleDarkModeColorChange}>
          <MenuItem value={"default"}>Default</MenuItem>
          <MenuItem value={"seaborn"}>Seaborn</MenuItem>
          <MenuItem value={"simpleWhite"}>SimpleWhite</MenuItem>
          <MenuItem value={"presentation"}>Presentation</MenuItem>
          <MenuItem value={"ggplot2"}>GGPlot2</MenuItem>
          <MenuItem value={"gridon"}>GridOn</MenuItem>
          <MenuItem value={"xgridOff"}>XGridOff</MenuItem>
          <MenuItem value={"ygridOff"}>YGridOff</MenuItem>
        </Select>
      </Grid>

      <Grid item xs={2}>
        <Typography variant="h5">Light Mode</Typography>
      </Grid>
      <Grid item xs={10}>
        <Select value={lightModeColor} onChange={handleLightModeColorChange}>
          <MenuItem value={"default"}>Default</MenuItem>
          <MenuItem value={"seaborn"}>Seaborn</MenuItem>
          <MenuItem value={"presentation"}>Presentation</MenuItem>
          <MenuItem value={"ggplot2"}>GGPlot2</MenuItem>
          <MenuItem value={"gridon"}>GridOn</MenuItem>
          <MenuItem value={"xgridOff"}>XGridOff</MenuItem>
          <MenuItem value={"ygridOff"}>YGridOff</MenuItem>
        </Select>
      </Grid>
    </Grid>
  )
}
