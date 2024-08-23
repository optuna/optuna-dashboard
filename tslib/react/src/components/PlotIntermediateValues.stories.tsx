import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { darkTheme } from "../styles/darkTheme"
import { lightTheme } from "../styles/lightTheme"
import { PlotIntermediateValues } from "./PlotIntermediateValues"

const meta: Meta<typeof PlotIntermediateValues> = {
  component: PlotIntermediateValues,
  title: "Plot/IntermediateValues",
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
              trials: study.trials,
              includePruned: false,
              logScale: false,
            }}
          />
        </ThemeProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PlotIntermediateValues>

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
