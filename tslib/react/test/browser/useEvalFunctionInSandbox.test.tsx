import { FloatDistribution, Study, Trial } from "@optuna/types"
import { userEvent } from "@vitest/browser/context"
import * as plotly from "plotly.js-dist-min"
import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { useEvalFunctionInSandbox } from "../../src"

describe("useEvalFunctionInSandbox Tests", async () => {
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
  const mockStudy: Study = {
    id: 1,
    name: "test-study",
    directions: ["minimize"],
    union_search_space: [],
    intersection_search_space: [],
    union_user_attrs: [],
    datetime_start: new Date("2025-01-01T00:00:00Z"),
    trials: mockTrials,
    metric_names: ["objective"],
  }

  test("Iframe renders correctly", async () => {
    const TestComponent = () => {
      const { renderIframeSandbox } = useEvalFunctionInSandbox()
      return renderIframeSandbox()
    }

    const { container } = render(<TestComponent />)
    const iframe = container.querySelector("iframe")
    await expect.element(iframe).toBeInTheDocument()

    expect(iframe).toHaveAttribute("sandbox", "allow-scripts")
    expect(iframe).toHaveStyle("display: none")
    expect(iframe).toHaveAttribute("srcDoc")
  })

  test("evalTrialFilter works when function is valid", async () => {
    let filteredTrials: Trial[] | null = []
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalTrialFilter, renderIframeSandbox } =
        useEvalFunctionInSandbox()
      return (
        <>
          {renderIframeSandbox()}
          <button
            type="button"
            onClick={async () => {
              filteredTrials = await evalTrialFilter(mockTrials, funcStr)
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

  test("evalTrialFilter handles invalid function strings", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalTrialFilter, renderIframeSandbox } =
        useEvalFunctionInSandbox()
      return (
        <>
          {renderIframeSandbox()}
          <button
            type="button"
            onClick={async () => {
              try {
                await evalTrialFilter(mockTrials, funcStr)
              } catch (err) {
                error = err
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

  test("evalTrialFilter rejects when iframe is not ready", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalTrialFilter } = useEvalFunctionInSandbox()
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await evalTrialFilter(mockTrials, funcStr)
            } catch (err) {
              error = err
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

  test("evalGeneratePlotlyGraph works when function is valid", async () => {
    let plotlyData: plotly.PlotData[] | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalGeneratePlotlyGraph, renderIframeSandbox } =
        useEvalFunctionInSandbox()
      return (
        <>
          {renderIframeSandbox()}
          <button
            type="button"
            onClick={async () => {
              plotlyData = await evalGeneratePlotlyGraph(mockStudy, funcStr)
            }}
          >
            Run
          </button>
        </>
      )
    }
    const runFuncStr = async (funcStr: string) => {
      plotlyData = null
      const { container } = render(<TestComponent funcStr={funcStr} />)
      const iframe = container.querySelector("iframe")
      const button = container.querySelector("button")
      await expect.element(iframe).toBeInTheDocument()
      await expect.element(button).toBeInTheDocument()
      if (button) await userEvent.click(button)
      await vi.waitFor(() => {
        expect(plotlyData).not.toBeNull()
      })
    }

    await runFuncStr(
      "(study) => [{ x: [1, 2, 3], y: [1, 4, 9], type: 'scatter' }]"
    )
    expect(plotlyData).toEqual([
      { x: [1, 2, 3], y: [1, 4, 9], type: "scatter" },
    ])

    await runFuncStr(
      "(study) => study.trials.map(trial => ({ x: [trial.number], y: trial.values, type: 'scatter' }))"
    )
    expect(plotlyData).toHaveLength(mockTrials.length)
    expect(plotlyData?.[0]).toHaveProperty("x")
    expect(plotlyData?.[0]).toHaveProperty("y")
    expect(plotlyData?.[0]).toHaveProperty("type", "scatter")

    await runFuncStr("(study) => []")
    expect(plotlyData).toEqual([])
  })

  test("evalGeneratePlotlyGraph handles invalid function strings", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalGeneratePlotlyGraph, renderIframeSandbox } =
        useEvalFunctionInSandbox()
      return (
        <>
          {renderIframeSandbox()}
          <button
            type="button"
            onClick={async () => {
              try {
                await evalGeneratePlotlyGraph(mockStudy, funcStr)
              } catch (err) {
                error = err
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

  test("evalGeneratePlotlyGraph rejects when iframe is not ready", async () => {
    let error: unknown | null = null
    const TestComponent = ({ funcStr }: { funcStr: string }) => {
      const { evalGeneratePlotlyGraph } = useEvalFunctionInSandbox()
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await evalGeneratePlotlyGraph(mockStudy, funcStr)
            } catch (err) {
              error = err
            }
          }}
        >
          Run
        </button>
      )
    }

    const { container } = render(<TestComponent funcStr="(study) => []" />)
    const button = container.querySelector("button")
    await expect.element(button).toBeInTheDocument()
    if (button) await userEvent.click(button)
    await vi.waitFor(() => {
      expect(error).not.toBeNull()
    })
    expect(String(error)).toContain("Sandbox iframe is not ready")
  })
})
