import { ThemeProvider } from "@mui/material";
import { Meta, StoryObj } from "@storybook/react";
import { mockStudies } from "../MockStudies";
import { darkTheme } from "../styles/darkTheme";
import { TrialTable } from "./TrialTable";

const meta: Meta<typeof TrialTable> = {
  component: TrialTable,
  title: "TrialTableDark",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: { default: "dark" },
  },
};

export default meta;
type Story = StoryObj<typeof TrialTable>;

export const MockStudy1: Story = {
  args: {
    study: mockStudies[0],
  },
};

export const MockStudy2: Story = {
  args: {
    study: mockStudies[1],
  },
};
