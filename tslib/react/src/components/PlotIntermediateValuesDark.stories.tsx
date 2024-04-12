import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { darkTheme } from "../styles/darkTheme"
import { PlotIntermediateValues } from "./PlotIntermediateValues"

const meta: Meta<typeof PlotIntermediateValues> = {
  component: PlotIntermediateValues,
  title: "PlotIntermediateValuesDark",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const { study } = useMockStudy(storyContext.parameters?.studyId)
      if (!study) return <p>loading...</p>
      return (
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <Story
            args={{
              trials: study.trials,
              includePruned: false,
              logScale: false,
            }}
          />
        </ThemeProvider>
      )
    },
  ],
  parameters: {
    backgrounds: { default: "dark" },
  },
}

export default meta
type Story = StoryObj<typeof PlotIntermediateValues>

export const MockStudyExample1: Story = {
  parameters: {
    studyId: 1,
  },
}
