import * as Optuna from "@optuna/types"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotEdf } from "../src/components/PlotEdf"

describe("PlotEdf Tests", async () => {
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
        <PlotEdf studies={[study]} objectiveId={0} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotEdf (study name: ${study.name})`, async () => {
      await act(async () => {
        setup({ study, dataTestId: `plot-edf-${study.id}` })
      })
      expect(screen.getByTestId(`plot-edf-${study.id}`)).toBeInTheDocument()
    })
  }
})
