import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { darkTheme } from "../styles/darkTheme"
import { lightTheme } from "../styles/lightTheme"
import { PlotTimeline } from "./PlotTimeline"

const meta: Meta<typeof PlotTimeline> = {
  component: PlotTimeline,
  title: "Plot/Timeline",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const { study } = useMockStudy(storyContext.parameters?.studyId)
      if (!study) return <p>loading...</p>
      return (
        <ThemeProvider theme={storyContext.parameters?.theme}>
          <CssBaseline />
          <Story
            args={{
              study,
            }}
          />
        </ThemeProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PlotTimeline>

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

// TODO(c-bata): Add a story for multi objective study.
// export const MultiObjective: Story = {
//   parameters: {
//     ...
//   },
// }
