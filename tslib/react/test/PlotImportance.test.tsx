import * as Optuna from "@optuna/types"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, test } from "vitest"
import { PlotImportance } from "../src/components/PlotImportance"

describe("PlotImportance Tests", async () => {
  const setup = ({
    study,
    importance,
    dataTestId,
  }: {
    study: Optuna.Study
    importance: Optuna.ParamImportance[][]
    dataTestId: string
  }) => {
    const Wrapper = ({
      dataTestId,
      children,
    }: {
      dataTestId: string
      children: React.ReactNode
    }) => <div data-testid={dataTestId}>{children}</div>
    return render(
      <Wrapper dataTestId={dataTestId}>
        <PlotImportance study={study} importance={importance} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`PlotImportance (study name: ${study.name})`, async () => {
      const importance = window.mockImportances[study.name] ?? []
      await act(async () => {
        setup({
          study,
          importance,
          dataTestId: `plot-importance-${study.id}`,
        })
      })
      expect(
        screen.getByTestId(`plot-importance-${study.id}`)
      ).toBeInTheDocument()
    })
  }
})
