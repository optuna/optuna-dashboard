import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { lightTheme } from "../styles/lightTheme"
import { PlotEdf } from "./PlotEdf"

const meta: Meta<typeof PlotEdf> = {
  component: PlotEdf,
  title: "PlotEdf",
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
              studies: [study],
              objectiveId: 0,
            }}
          />
        </ThemeProvider>
      )
    },
  ],
}

export default meta
type Story = StoryObj<typeof PlotEdf>

export const MockStudyExample1: Story = {
  parameters: {
    studyId: 1,
  },
}
