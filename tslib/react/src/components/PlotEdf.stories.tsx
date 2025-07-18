import { CssBaseline, ThemeProvider } from "@mui/material"
import { Meta, StoryObj } from "@storybook/react-vite"
import React from "react"
import { useMockStudy } from "../MockStudies"
import { darkTheme } from "../styles/darkTheme"
import { lightTheme } from "../styles/lightTheme"
import { PlotEdf } from "./PlotEdf"

const meta: Meta<typeof PlotEdf> = {
  component: PlotEdf,
  title: "Plot/EDF",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const studyId = storyContext.parameters?.studyId
      const { study } = useMockStudy(studyId)
      if (!study) return <p>loading...</p>

      return (
        <ThemeProvider theme={storyContext.parameters?.theme}>
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
