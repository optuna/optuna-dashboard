import { createTheme } from "@mui/material"
import blue from "@mui/material/colors/blue"
import pink from "@mui/material/colors/pink"

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: blue,
    secondary: pink,
  },
})
