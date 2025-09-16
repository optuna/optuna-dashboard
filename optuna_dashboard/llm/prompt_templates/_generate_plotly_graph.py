from __future__ import annotations


_STUDY_DEFINITION_IN_TYPESCRIPT = """```typescript
export type TrialState = "Running" | "Complete" | "Pruned" | "Fail" | "Waiting";
export type TrialIntermediateValue = {
    step: number;
    value: number;
};
export type Attribute = {
    key: string;
    value: string;
};
export type Trial = {
    trial_id: number;
    study_id: number;
    number: number;
    state: TrialState;
    values?: number[];  // ith-objective value is stored in values[i] (note: 0-indexed)
    params: TrialParam[];
    intermediate_values: TrialIntermediateValue[];
    user_attrs: Attribute[];
    datetime_start?: Date;
    datetime_complete?: Date;
    constraints: number[];
};
export type TrialParam = {
    name: string;
    param_internal_value: number;
    param_external_value: string;
    param_external_type: string;
    distribution: Distribution;
};
export type StudyDirection = "maximize" | "minimize";
export type Artifact = {
    artifact_id: string;
    filename: string;
    mimetype: string;
    encoding: string;
};
export type Study = {
    id: number;
    name: string;
    directions: StudyDirection[];
    user_attrs: Attribute[];
    best_trials: Trial[];
    trials: Trial[];
    artifacts: Artifact[];
};
```"""

_GENERATE_PLOTLY_GRAPH_PROMPT_TEMPLATE = """Please write a JavaScript function that, given the Study object named `study`, returns an array of Plotly trace objects (PlotData[]) to visualize the user's request.

Requirements:
1. Input: a variable `study` of type Study (see definitions below). Do not redefine `study`.
2. Output: an array (e.g. `[trace1, trace2, ...]`) of Plotly trace objects (each object corresponds to a Plotly `data` item). Do NOT include the layout object, only data traces.
3. The function must be a pure function: it must not modify `study` or any trials inside it.
4. No network requests, no DOM access, no external I/O, no eval, no Function constructor.
5. Handle missing or incomplete trials safely: skip trials where required values are undefined (e.g. failed trials without `values`).
6. Ensure arrays `x` and `y` are the same length for each trace. Filter out undefined entries first.
7. Avoid extremely large custom objects; keep each trace under ~5000 points (if more, sample evenly).
8. Return only JavaScript function code; no surrounding code fences or commentary.

Study / Trial type definitions:
{study_definition_in_typescript}

Examples:
// Example A: Plot objective value vs trial number (first objective)
function(study){{
  const trials = study.trials.filter(t => t.state === "Complete" && t.values && t.values.length > 0);
  return [{{
    type: "scatter",
    mode: "markers",
    name: "Objective 0",
    x: trials.map(t => t.number),
    y: trials.map(t => t.values[0])
  }}];
}}

// Example B: Parameter 'x' vs objective
function(study){{
  const paramName = "x";
  const trials = study.trials.filter(t => t.state === "Complete" && t.values && t.values.length > 0);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const t of trials){{
    const p = t.params.find(pp => pp.name === paramName);
    if(!p) continue;
    xs.push(p.param_internal_value);
    ys.push(t.values[0]);
  }}
  return [{{type: "scatter", mode: "markers", name: `${{paramName}} vs obj0`, x: xs, y: ys}}];
}}

====== Instructions Finished ======

Your task:
Given the following user query, please return a valid JavaScript function code as is (note: do not wrap your output using code blocks such as ```javascript``` ).
If the request is ambiguous, make a reasonable assumption and note it in a code comment at the top of the function:
{user_query}

====== User Query Finished ======
{generate_plotly_graph_failure_message}
"""

GENERATE_PLOTLY_GRAPH_FAILURE_MESSAGE_TEMPLATE = """
Please notice that the last response generated the following function:

```javascript
{last_func_str}
```

This function failed with the following error message:

```
{error_message}
```

Please consider the error message and generate another code that retains the user query without any errors.
Remember the same security constraints: no network requests, no DOM manipulation, no external calls, no I/O operations, and no trial modifications.
Do not forget to return a valid JavaScript function code without any other texts."""


def get_generate_plotly_graph_prompt(
    user_query: str, last_func_str: str | None = None, last_error_msg: str | None = None
) -> str:
    failure_msg = ""
    if last_func_str is not None:
        failure_msg = GENERATE_PLOTLY_GRAPH_FAILURE_MESSAGE_TEMPLATE.format(
            last_func_str=last_func_str, error_message=last_error_msg or "No Error Message Provided."
        )
    return _GENERATE_PLOTLY_GRAPH_PROMPT_TEMPLATE.format(
        user_query=user_query,
        generate_plotly_graph_failure_message=failure_msg,
        study_definition_in_typescript=_STUDY_DEFINITION_IN_TYPESCRIPT
    )
