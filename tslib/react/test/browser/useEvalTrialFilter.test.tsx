import { FloatDistribution, Trial } from "@optuna/types"
import { userEvent } from "@vitest/browser/context"
import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { useEvalTrialFilter } from "../../src"

describe("useEvalTrialFilter Tests", async () => {
  const mockDistribution: FloatDistribution = {
    type: "FloatDistribution",
    low: 0,
    high: 1,
    step: null,
    log: false,
  }
  const mockTrials: Trial[] = [...Array(5).keys()].map((i) => ({
    trial_id: i + 1,
    study_id: 1,
    number: i + 1,
    state: "Complete",
    values: [(5 - i) * 0.1],
    params: [
      {
        name: "x",
        param_internal_value: (5 - i) * 0.1,
        param_external_type: "float",
        param_external_value: `${(5 - i) * 0.1}`,
        distribution: mockDistribution,
      },
    ],
    intermediate_values: [],
    user_attrs: [],
    datetime_start: new Date("2025-01-01T00:00:00Z"),
    datetime_end: new Date("2025-01-01T00:00:01Z"),
    constraints: [],
  }))

  test("Iframe renders correctly", async () => {
    const TestComponent = () => {
      const [_, renderIframe] = useEvalTrialFilter()
      return renderIframe()
    }

    const { container } = render(<TestComponent />)
    const iframe = container.querySelector("iframe")
    await expect.element(iframe).toBeInTheDocument()

    expect(iframe).toHaveAttribute("sandbox", "allow-scripts")
    expect(iframe).toHaveStyle("display: none")
    expect(iframe).toHaveAttribute("srcDoc")
  })

  test("Filtering works when function is valid", async () => {
    let filteredTrials: Trial[] | null = []
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const [trialFilter, renderIframe] = useEvalTrialFilter()
      return (
        <>
          {renderIframe()}
          <button
            type="button"
            onClick={async () => {
              if (trialFilter) {
                filteredTrials = await trialFilter(mockTrials, funcStr)
              }
            }}
          >
            Run
          </button>
        </>
      )
    }
    const runFuncStr = async (funcStr: string) => {
      filteredTrials = null
      const { container } = render(<TestComponent funcStr={funcStr} />)
      const iframe = container.querySelector("iframe")
      const button = container.querySelector("button")
      await expect.element(iframe).toBeInTheDocument()
      await expect.element(button).toBeInTheDocument()
      if (button) await userEvent.click(button)
      await vi.waitFor(() => {
        expect(filteredTrials).not.toBeNull()
      })
    }

    await runFuncStr("() => true")
    expect(filteredTrials?.length).toBe(mockTrials.length)

    await runFuncStr("() => false")
    expect(filteredTrials?.length).toBe(0)

    await runFuncStr("(trial) => trial.number < 3")
    expect(filteredTrials?.length).toBe(
      mockTrials.filter((t) => t.number < 3).length
    )

    await runFuncStr("(trial) => trial.values[0] > 0.3")
    expect(filteredTrials?.length).toBe(
      mockTrials.filter((t) => t.values?.[0] !== undefined && t.values[0] > 0.3)
        .length
    )
  })

  test("Handles invalid function strings", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const [trialFilter, renderIframe] = useEvalTrialFilter()
      return (
        <>
          {renderIframe()}
          <button
            type="button"
            onClick={async () => {
              if (trialFilter) {
                try {
                  await trialFilter(mockTrials, funcStr)
                } catch (err) {
                  error = err
                }
              }
            }}
          >
            Run
          </button>
        </>
      )
    }
    const runFuncStr = async (funcStr: string) => {
      error = null
      const { container } = render(<TestComponent funcStr={funcStr} />)
      const iframe = container.querySelector("iframe")
      const button = container.querySelector("button")
      await expect.element(iframe).toBeInTheDocument()
      await expect.element(button).toBeInTheDocument()
      if (button) await userEvent.click(button)
      await vi.waitFor(() => {
        expect(error).not.toBeNull()
      })
    }

    await runFuncStr("")
    expect(String(error)).toContain("SyntaxError")

    await runFuncStr("Invalid JavaScript function")
    expect(String(error)).toContain("SyntaxError")

    await runFuncStr("1")
    expect(String(error)).toContain("TypeError")
  })

  test("Rejects when iframe is not ready", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const [trialFilter, _] = useEvalTrialFilter()
      return (
        <button
          type="button"
          onClick={async () => {
            if (trialFilter) {
              try {
                await trialFilter(mockTrials, funcStr)
              } catch (err) {
                error = err
              }
            }
          }}
        >
          Run
        </button>
      )
    }
    const { container } = render(<TestComponent funcStr="() => true" />)
    const button = container.querySelector("button")
    await expect.element(button).toBeInTheDocument()
    if (button) await userEvent.click(button)
    await vi.waitFor(() => {
      expect(error).not.toBeNull()
    })
    expect(String(error)).toContain("Sandbox iframe is not ready")
  })
})
