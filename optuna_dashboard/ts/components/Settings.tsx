import React, { FC, useState } from "react"

import {
  Typography,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
} from "@mui/material"

export const Settings: FC<{
  // studyId: number
  // trialId: number
}> = () => {
  const [darkModeColor, setDarkModeColor] = useState("Default(Blue)")
  const [lightModeColor, setLightModeColor] = useState("Default(Blue)")

  const handleDarkModeColorChange = (event: SelectChangeEvent) => {
    setDarkModeColor(event.target.value)
  }

  const handleLightModeColorChange = (event: SelectChangeEvent) => {
    setLightModeColor(event.target.value)
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
          <MenuItem value={"Default(Blue)"}>Default(Blue)</MenuItem>
          <MenuItem value={"Greys"}>Greys</MenuItem>
          <MenuItem value={"YlGnBu"}>YlGnBu</MenuItem>
          <MenuItem value={"Greens"}>Greens</MenuItem>
        </Select>
      </Grid>

      <Grid item xs={2}>
        <Typography variant="h5">Light Mode</Typography>
      </Grid>
      <Grid item xs={10}>
        <Select value={lightModeColor} onChange={handleLightModeColorChange}>
          <MenuItem value={"Default(Blue)"}>Default(Blue)</MenuItem>
          <MenuItem value={"Greys"}>Greys</MenuItem>
          <MenuItem value={"YlGnBu"}>YlGnBu</MenuItem>
          <MenuItem value={"Greens"}>Greens</MenuItem>
        </Select>
      </Grid>
    </Grid>
  )
}
