import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { lightTheme } from "../styles/lightTheme"
import { PlotSlice } from "./PlotSlice"

const meta: Meta<typeof PlotSlice> = {
  component: PlotSlice,
  title: "PlotSlice",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const { study } = useMockStudy(storyContext.parameters?.studyId)
      if (!study) return <p>loading...</p>
      return (
        <ThemeProvider theme={lightTheme}>
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
type Story = StoryObj<typeof PlotSlice>

export const MockStudyExample1: Story = {
  parameters: {
    studyId: 1,
  },
}