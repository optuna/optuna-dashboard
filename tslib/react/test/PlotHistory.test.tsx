import { render, screen } from "@testing-library/react"
import React from "react"
import * as Optuna from "@optuna/types"
import { PlotHistory } from "../src/components/PlotHistory"
import { describe, test, expect } from "vitest"

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
        <PlotHistory study={study} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotHistory (studyId: ${study.study_id})`, () => {
      setup({ study, dataTestId: `plot-history-${study.study_id}` })
      expect(screen.getByTestId(`plot-history-${study.study_id}`)).toBeTruthy()
    })
  }
})
