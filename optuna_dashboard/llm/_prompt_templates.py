TRIAL_FILTERING_PROMPT = """Please write a filtering function for the user query provided in Javascript.
The function should take a trial object as input and return True if the trial matches the query, and False otherwise.
The definitions of the trial and related objects are as follows:

```typescript
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
```

Examples of the filtering function are provided below:

```javascript
// Example 1 - query: complete trials with objective value < -10
function (trial) {
    return trial.state === "Complete" && trial.values[0] < -10;  // Note that trial.values is not available for failed trials
}

// Example 2 - query: trials with parameter x = 1
function filterTrial(trial) {
    return trial.params["x"] === 1;
}
```

Your response will be used as follows:
```javascript
[
    ...study.trials
    .filter(eval(your_response))
    .map((trial) => trial.number)
]
```

You must only return a valid Javascript function code without any other texts since your response will be evaluated as is.

====== Instructions Finished ======

Given the following user query, please return a valid Javascript function code without any other texts:
{user_query}

====== User Query Finished ======
{trial_filtering_failure_message}
"""  # noqa: E501

TRIAL_FILTERING_FAILURE_MESSAGE_TEMPLATE = """
Please notice that the last trial generated the following function:

```javascript
{last_trial_filtering_func_str}
```

This function failed with the following error message:

```
{trial_flitering_error_message}
```

Please consider the error message and generate another code that retains the user query without any errors.
Do not forget to return a valid Javascript function code without any other texts.
"""  # noqa: E501
