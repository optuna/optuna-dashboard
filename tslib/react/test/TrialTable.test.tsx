import { render, screen } from "@testing-library/react"
import React from "react"
import * as Optuna from "@optuna/types"
import { TrialTable } from "../src/components/TrialTable"
import { describe, test, expect } from "vitest"

describe("TrialTable Tests", async () => {
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
        <TrialTable study={study} />
      </Wrapper>
    )
  }

  for (const study of window.mockStudies) {
    test(`TrialTable (studyId: ${study.study_id})`, () => {
      setup({ study, dataTestId: `trial-table-${study.study_id}` })
      expect(
        screen.getByTestId(`trial-table-${study.study_id}`)
      ).toBeInTheDocument()
    })
  }
})
