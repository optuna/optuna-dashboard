import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { darkTheme } from "../styles/darkTheme"
import { lightTheme } from "../styles/lightTheme"
import { PlotHistory } from "./PlotHistory"

const meta: Meta<typeof PlotHistory> = {
  component: PlotHistory,
  title: "Plot/History",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const { study } = useMockStudy(storyContext.parameters?.studyId)
      if (!study) return <p>loading...</p>
      const studies = [study]
      return (
        <ThemeProvider theme={storyContext.parameters?.theme}>
          <CssBaseline />
          <Story
            args={{
              studies,
            }}
          />
        </ThemeProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PlotHistory>

export const LightTheme: Story = {
  parameters: {
    studyId: 1,
    theme: lightTheme,
  },
}

export const DarkTheme: Story = {
  parameters: {
    studyId: 1,
    theme: darkTheme,
  },
}

// TODO(c-bata): Add a story for the case where two studies are compared.
// export const CompareStudy: Story = {
//   parameters: {
//     ...
//   },
// }

// TODO(c-bata): Add a story for multi objective study.
// export const MultiObjective: Story = {
//   parameters: {
//     ...
//   },
// }
