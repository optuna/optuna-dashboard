import { Meta, StoryObj } from "@storybook/react";
import { mockStudies } from "../MockStudies";
import { PlotHistory } from "./PlotHistory";

const meta: Meta<typeof PlotHistory> = {
  component: PlotHistory,
  title: "PlotHistory",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PlotHistory>;

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
