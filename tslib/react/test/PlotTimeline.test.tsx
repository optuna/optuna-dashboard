import * as Optuna from "@optuna/types"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotTimeline } from "../src/components/PlotTimeline"

describe("PlotTimeline Tests", async () => {
  const setup = ({
    study,
    dataTestId,
  }: { study: Optuna.Study; dataTestId: string }) => {
    const Wrapper = ({
      dataTestId,
      children,
    }: {
      dataTestId: string
      children: React.ReactNode
    }) => <div data-testid={dataTestId}>{children}</div>
    return render(
      <Wrapper dataTestId={dataTestId}>
        <PlotTimeline study={study} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotTimeline (study name: ${study.name})`, async () => {
      await act(async () => {
        setup({ study, dataTestId: `plot-timeline-${study.id}` })
      })
      expect(
        screen.getByTestId(`plot-timeline-${study.id}`)
      ).toBeInTheDocument()
    })
  }
})
