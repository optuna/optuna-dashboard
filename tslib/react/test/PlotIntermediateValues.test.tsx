import * as Optuna from "@optuna/types"
import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotIntermediateValues } from "../src/components/PlotIntermediateValues"

describe("PlotIntermediateValues Tests", async () => {
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
        <PlotIntermediateValues
          trials={study.trials}
          includePruned={false}
          logScale={false}
        />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotIntermediateValues (study name: ${study.study_name})`, () => {
      setup({ study, dataTestId: `plot-intermediatevalues-${study.study_id}` })
      expect(
        screen.getByTestId(`plot-intermediatevalues-${study.study_id}`)
      ).toBeInTheDocument()
    })
  }
})
