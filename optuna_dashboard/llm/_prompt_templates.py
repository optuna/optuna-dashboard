from __future__ import annotations


_TRIAL_DEFINITION_IN_TYPESCRIPT = """```typescript
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
```"""

_TRIAL_FILTERING_PROMPT_TEMPLATE = """Please write a filtering function for the user query provided in JavaScript.
The function should take a trial object as input and return True if the trial matches the query, and False otherwise.
The definitions of the trial and related objects are as follows:

{trial_definition_in_typescript}

Examples of the filtering function are provided below:

```javascript
// Example 1 - query: complete trials with objective value < -10
function (trial) {{
    return trial.state === "Complete" && trial.values[0] < -10;  // Note that trial.values is not available for failed trials
}}

// Example 2 - query: trials with parameter x = 1
function filterTrial(trial) {{
    return trial.params["x"] === 1;
}}
```

Your response will be used as follows:
```javascript
[
    ...study.trials
    .filter(eval(YOUR_RESPONSE))
    .map((trial) => trial.number)
]
```

Output constraints:
- Return only a valid JavaScript function code without any other texts to evaluate your response as is.
- Do not perform any network requests (e.g., fetch, XMLHttpRequest, etc.).
- Do not manipulate the DOM (e.g., form submissions, element insertion, or removal).
- Do not perform any external calls or I/O operations.
- Use the input trial for read-only purposes (no modifications).
- Do not include any code that could potentially harm, mislead, or deceive the user.

====== Instructions Finished ======

Given the following user query, please return a valid JavaScript function code without any other texts:
{user_query}

====== User Query Finished ======
{trial_filtering_failure_message}
"""  # noqa: E501

_TRIAL_FILTERING_FAILURE_MESSAGE_TEMPLATE = """
Please notice that the last response generated the following function:

```javascript
{last_trial_filtering_func_str}
```

This function failed with the following error message:

```
{trial_flitering_error_message}
```

Please consider the error message and generate another code that retains the user query without any errors.
Remember the same security constraints: no network requests, no DOM manipulation, no external calls, no I/O operations, and no trial modifications.
Do not forget to return a valid JavaScript function code without any other texts."""  # noqa: E501


def get_trial_filtering_prompt(
    user_query: str, last_func_str: str | None = None, last_error_msg: str | None = None
) -> str:
    if last_func_str is not None:
        failure_msg = _TRIAL_FILTERING_FAILURE_MESSAGE_TEMPLATE.format(
            last_trial_filtering_func_str=last_func_str,
            trial_flitering_error_message=last_error_msg or "No Error Message Provided.",
        )
    else:
        failure_msg = ""

    return _TRIAL_FILTERING_PROMPT_TEMPLATE.format(
        user_query=user_query,
        trial_filtering_failure_message=failure_msg,
        trial_definition_in_typescript=_TRIAL_DEFINITION_IN_TYPESCRIPT,
    )
