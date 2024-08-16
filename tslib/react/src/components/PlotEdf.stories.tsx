import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { lightTheme } from "../styles/lightTheme"
import { darkTheme } from "../styles/darkTheme"
import { PlotEdf } from "./PlotEdf"

const meta: Meta<typeof PlotEdf> = {
  component: PlotEdf,
  title: "PlotEdf",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const studyId = storyContext.parameters?.studyId;
      const theme = storyContext.parameters?.theme;

      const { study } = useMockStudy(studyId)
      if (!study) return <p>loading...</p>

      return (
        <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
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

export const LightTheme: Story = {
  parameters: {
    studyId: 1,
    theme: "light",
  },
}

export const DarkTheme: Story = {
  parameters: {
    studyId: 1,
    theme: "dark",
  },
}
