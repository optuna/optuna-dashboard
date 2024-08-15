import * as Optuna from "@optuna/types"
import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotHistory } from "../src/components/PlotHistory"

describe("PlotHistory Tests", async () => {
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
        <PlotHistory studies={[study]} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotHistory (study name: ${study.name})`, () => {
      setup({ study, dataTestId: `plot-history-${study.id}` })
      expect(screen.getByTestId(`plot-history-${study.id}`)).toBeInTheDocument()
    })
  }
})
