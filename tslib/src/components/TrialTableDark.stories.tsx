import { ThemeProvider } from "@mui/material";
import { Meta, StoryObj } from "@storybook/react";
import { useMockStudy } from "../MockStudies";
import { darkTheme } from "../styles/darkTheme";
import { TrialTable } from "./TrialTable";

const meta: Meta<typeof TrialTable> = {
  component: TrialTable,
  title: "TrialTableDark",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const study = useMockStudy(storyContext.parameters?.studyId);
      if (!study) return <p>loading...</p>;
      return (
        <ThemeProvider theme={darkTheme}>
          <Story
            args={{
              study,
            }}
          />
        </ThemeProvider>
      );
    },
  ],
  parameters: {
    backgrounds: { default: "dark" },
  },
};

export default meta;
type Story = StoryObj<typeof TrialTable>;

export const MockStudy1: Story = {
  parameters: {
    studyId: 1,
  },
};
