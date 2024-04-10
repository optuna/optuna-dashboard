import { Meta, StoryObj } from "@storybook/react"
import { useMockStudy } from "../MockStudies"
import { PlotImportance } from "./PlotImportance"
import React from "react"
import { ThemeProvider } from "@mui/material"
import { darkTheme } from "../styles/darkTheme"

const meta: Meta<typeof PlotImportance> = {
  component: PlotImportance,
  title: "PlotImportanceDark",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const study = useMockStudy(storyContext.parameters?.studyId)
      if (!study) return <p>loading...</p>
      return (
        <ThemeProvider theme={darkTheme}>
          <Story
            args={{
              study,
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
type Story = StoryObj<typeof PlotImportance>

export const MockStudy1: Story = {
  parameters: {
    studyId: 1,
  },
}
