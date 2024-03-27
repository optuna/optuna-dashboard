import { Meta, StoryObj } from "@storybook/react";
import { useMockStudy } from "../MockStudies";
import { TrialTable } from "./TrialTable";

const meta: Meta<typeof TrialTable> = {
  component: TrialTable,
  title: "TrialTable",
  tags: ["autodocs"],
  decorators: [
    (Story, storyContext) => {
      const study = useMockStudy(storyContext.parameters?.studyId);
      if (!study) return <p>loading...</p>;
      return (
        <Story
          args={{
            study,
          }}
        />
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof TrialTable>;

export const MockStudy1: Story = {
  parameters: {
    studyId: 1,
  },
};
