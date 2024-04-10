import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { lightTheme } from "../styles/lightTheme"
import { PlotHistory } from "./PlotHistory"

const meta: Meta<typeof PlotHistory> = {
  component: PlotHistory,
  title: "PlotHistory",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const study = useMockStudy(storyContext.parameters?.studyId)
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
type Story = StoryObj<typeof PlotHistory>

export const MockStudy1: Story = {
  parameters: {
    studyId: 1,
  },
}
