import { Meta, StoryObj } from "@storybook/react";
import { mockStudies } from "../MockStudies";
import { TrialTable } from "./TrialTable";

const meta: Meta<typeof TrialTable> = {
  component: TrialTable,
  title: "TrialTable",
  tags: ["autodocs"],
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
