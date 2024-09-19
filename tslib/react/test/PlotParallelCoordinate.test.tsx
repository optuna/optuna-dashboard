import * as Optuna from "@optuna/types"
import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotParallelCoordinate } from "../src/components/PlotParallelCoordinate"

describe("PlotParallelCoordinate Tests", async () => {
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
        <PlotParallelCoordinate study={study} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotParallelCoordinate (study name: ${study.name})`, () => {
      setup({ study, dataTestId: `plot-parallel-coordinate-${study.id}` })
      expect(
        screen.getByTestId(`plot-parallel-coordinate-${study.id}`)
      ).toBeInTheDocument()
    })
  }
})
