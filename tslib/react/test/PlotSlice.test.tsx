import * as Optuna from "@optuna/types"
import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotSlice } from "../src/components/PlotSlice"

describe("PlotSlice Tests", async () => {
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
        <PlotSlice study={study} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotSlice (study name: ${study.name})`, () => {
      setup({ study, dataTestId: `plot-slice-${study.id}` })
      expect(screen.getByTestId(`plot-slice-${study.id}`)).toBeInTheDocument()
    })
  }
})