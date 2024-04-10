import { createTheme } from "@mui/material"
import blue from "@mui/material/colors/blue"
import pink from "@mui/material/colors/pink"

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: blue,
    secondary: pink,
  },
})
