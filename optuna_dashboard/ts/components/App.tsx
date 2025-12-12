import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  useMediaQuery,
} from "@mui/material"
import { SnackbarProvider } from "notistack"
import React, { useMemo, useState, useEffect, FC } from "react"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useConstants } from "../constantsProvider"
import { CompareStudies } from "./CompareStudies"
import { StudyDetail } from "./StudyDetail"
import { StudyList } from "./StudyList"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
})

// Clean neutral palette matching Plotly backgrounds
const modernPalette = {
  light: {
    primary: {
      main: "#2563eb",
      light: "#3b82f6",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#64748b",
      light: "#94a3b8",
      dark: "#475569",
      contrastText: "#ffffff",
    },
    background: {
      default: "#fafafa",
      paper: "#ffffff",
    },
    text: {
      primary: "#171717",
      secondary: "#525252",
    },
    divider: "#e5e5e5",
  },
  dark: {
    primary: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#94a3b8",
      light: "#cbd5e1",
      dark: "#64748b",
      contrastText: "#000000",
    },
    background: {
      default: "#0a0a0a",
      paper: "#111111", // Matches Plotly plot_bgcolor exactly
    },
    text: {
      primary: "#f5f5f5",
      secondary: "#a3a3a3",
    },
    divider: "#262626",
  },
}

export const App: FC = () => {
  const { color_mode, url_prefix } = useConstants()

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")
  const [optunaDashboardColorMode, optunaDashboardSetColorMode] = useState<
    "light" | "dark"
  >("light")
  useEffect(() => {
    optunaDashboardSetColorMode(prefersDarkMode ? "dark" : "light")
  }, [prefersDarkMode])

  const theme = useMemo(() => {
    const mode =
      color_mode !== undefined ? color_mode : optunaDashboardColorMode
    const palette = mode === "dark" ? modernPalette.dark : modernPalette.light

    return createTheme({
      palette: {
        mode,
        ...palette,
      },
      typography: {
        fontFamily: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ].join(","),
        h1: { fontWeight: 600, letterSpacing: "-0.025em" },
        h2: { fontWeight: 600, letterSpacing: "-0.025em" },
        h3: { fontWeight: 600, letterSpacing: "-0.02em" },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { textTransform: "none", fontWeight: 500 },
      },
      shape: {
        borderRadius: 12,
      },
      shadows: [
        "none",
        "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      ],
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: mode === "dark" ? "#0a0a0a" : "#fafafa",
              },
              "&::-webkit-scrollbar-thumb": {
                background: mode === "dark" ? "#333333" : "#d4d4d4",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: mode === "dark" ? "#525252" : "#a3a3a3",
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              border:
                mode === "dark" ? "1px solid #262626" : "1px solid #e5e5e5",
              boxShadow:
                mode === "dark"
                  ? "0 1px 3px 0 rgb(0 0 0 / 0.3)"
                  : "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              transition: "all 0.2s ease-in-out",
              backgroundColor: mode === "dark" ? "#111111" : "#ffffff",
              "&:hover": {
                boxShadow:
                  mode === "dark"
                    ? "0 4px 12px 0 rgb(0 0 0 / 0.5)"
                    : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 500,
              transition: "all 0.2s ease-in-out",
            },
            contained: {
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              "&:hover": {
                boxShadow:
                  "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                transform: "translateY(-1px)",
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: mode === "dark" ? "#0a0a0a" : "#ffffff",
              color: mode === "dark" ? "#f5f5f5" : "#171717",
              borderBottom:
                mode === "dark" ? "1px solid #262626" : "1px solid #e5e5e5",
              boxShadow: "none",
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: mode === "dark" ? "#0a0a0a" : "#ffffff",
              borderRight:
                mode === "dark" ? "1px solid #262626" : "1px solid #e5e5e5",
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              margin: "2px 8px",
              transition: "all 0.15s ease-in-out",
              "&.Mui-selected": {
                backgroundColor: mode === "dark" ? "#1e3a5f" : "#dbeafe",
                color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                "&:hover": {
                  backgroundColor: mode === "dark" ? "#1e3a5f" : "#bfdbfe",
                },
                "& .MuiListItemIcon-root": {
                  color: mode === "dark" ? "#60a5fa" : "#1d4ed8",
                },
              },
              "&:hover": {
                backgroundColor: mode === "dark" ? "#1a1a1a" : "#f5f5f5",
              },
            },
          },
        },
        MuiSwitch: {
          styleOverrides: {
            root: {
              width: 42,
              margin: 9,
              height: 26,
              padding: 0,
              "& .MuiSwitch-switchBase": {
                padding: 0,
                margin: 2,
                transitionDuration: "200ms",
                "&.Mui-checked": {
                  transform: "translateX(16px)",
                  color: "#fff",
                  "& + .MuiSwitch-track": {
                    backgroundColor: "#3b82f6",
                    opacity: 1,
                    border: 0,
                  },
                },
              },
              "& .MuiSwitch-thumb": {
                boxSizing: "border-box",
                width: 22,
                height: 22,
              },
              "& .MuiSwitch-track": {
                borderRadius: 26 / 2,
                backgroundColor: mode === "dark" ? "#404040" : "#d4d4d4",
                opacity: 1,
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
              fontWeight: 500,
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: "0.8125rem",
              backgroundColor: mode === "dark" ? "#262626" : "#171717",
              color: "#f5f5f5",
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
            },
          },
        },
        MuiTableHead: {
          styleOverrides: {
            root: {
              "& .MuiTableCell-root": {
                fontWeight: 600,
                backgroundColor: mode === "dark" ? "#0a0a0a" : "#fafafa",
                borderBottom:
                  mode === "dark" ? "1px solid #262626" : "1px solid #e5e5e5",
              },
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: "background-color 0.15s ease-in-out",
              "&:hover": {
                backgroundColor: mode === "dark" ? "#1a1a1a" : "#fafafa",
              },
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom:
                mode === "dark" ? "1px solid #262626" : "1px solid #e5e5e5",
            },
          },
        },
        MuiDivider: {
          styleOverrides: {
            root: {
              borderColor: mode === "dark" ? "#262626" : "#e5e5e5",
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              transition: "all 0.15s ease-in-out",
              "&:hover": {
                backgroundColor: mode === "dark" ? "#262626" : "#f5f5f5",
              },
            },
          },
        },
        MuiSelect: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 8,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: mode === "dark" ? "#333333" : "#d4d4d4",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: mode === "dark" ? "#525252" : "#a3a3a3",
              },
            },
          },
        },
      },
    })
  }, [optunaDashboardColorMode, color_mode])

  const toggleColorMode = () => {
    optunaDashboardSetColorMode(
      optunaDashboardColorMode === "dark" ? "light" : "dark"
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          component="div"
          sx={{
            backgroundColor: theme.palette.background.default,
            width: "100%",
            minHeight: "100vh",
            transition: "background-color 0.2s ease-in-out",
          }}
        >
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
          >
            <Router>
              <Routes>
                <Route
                  path={url_prefix + "/studies/:studyId/analytics"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"analytics"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/trials"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialList"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/trialTable"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialTable"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/smartSelection"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"trialSelection"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/note"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"note"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/graph"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"graph"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"top"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/studies/:studyId/preference-history"}
                  element={
                    <StudyDetail
                      toggleColorMode={toggleColorMode}
                      page={"preferenceHistory"}
                    />
                  }
                />
                <Route
                  path={url_prefix + "/compare-studies"}
                  element={<CompareStudies toggleColorMode={toggleColorMode} />}
                />
                <Route
                  path={url_prefix + "/"}
                  element={<StudyList toggleColorMode={toggleColorMode} />}
                />
              </Routes>
            </Router>
          </SnackbarProvider>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
