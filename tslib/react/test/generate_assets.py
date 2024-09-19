import json
import logging
import math
import os.path
import shutil
from typing import Tuple

import optuna
from optuna.distributions import CategoricalDistribution
from optuna.distributions import FloatDistribution
from optuna.importance import get_param_importances
from optuna.importance import PedAnovaImportanceEvaluator
from optuna.storages import BaseStorage
from optuna.storages import JournalFileStorage
from optuna.storages import JournalStorage


optuna.logging.set_verbosity(logging.CRITICAL)
BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "asset")


def remove_assets() -> None:
    if os.path.exists(BASE_DIR):
        shutil.rmtree(BASE_DIR)
    os.mkdir(BASE_DIR)


def create_optuna_storage(
    storage: BaseStorage, params_importances: dict[str, list[dict[str, float]]]
) -> optuna.storages.InMemoryStorage:
    # Single-objective study
    study = optuna.create_study(
        study_name="single-objective", storage=storage, sampler=optuna.samplers.RandomSampler()
    )

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        trial.suggest_categorical("x3", ["foo", "bar"])
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=100)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single-objective study with dynamic search space
    study = optuna.create_study(
        study_name="single-objective-dynamic", storage=storage, direction="maximize"
    )

    def objective_single_dynamic(trial: optuna.Trial) -> float:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            return (trial.suggest_float("x1", 0, 10) - 2) ** 2
        else:
            return -((trial.suggest_float("x2", -10, 0) + 5) ** 2)

    study.optimize(objective_single_dynamic, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    study = optuna.create_study(
        study_name="check-rank-plot", storage=storage, sampler=optuna.samplers.RandomSampler()
    )

    def objective_single(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        trial.suggest_float("x3", 0, 10)
        trial.suggest_float("x4", 0, 10)
        trial.suggest_float("x5", 0, 10)
        trial.suggest_float("x6", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single, n_trials=1000)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single-objective study
    study = optuna.create_study(study_name="single-objective-user-attrs", storage=storage)

    def objective_single_user_attr(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        if x1 < 5:
            trial.set_user_attr("X", "foo")
        else:
            trial.set_user_attr("X", "bar")
        trial.set_user_attr("Y", x1 + x2)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single_user_attr, n_trials=100)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single objective study with 'inf', '-inf', or 'nan' value
    study = optuna.create_study(study_name="single-inf", storage=storage)

    def objective_single_inf(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            return float("inf")
        elif trial.number % 3 == 1:
            return float("-inf")
        else:
            return x**2

    study.optimize(objective_single_inf, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single objective pruned after reported 'inf', '-inf', or 'nan'
    study = optuna.create_study(study_name="single-inf-report", storage=storage)

    def objective_single_inf_report(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -10, 10)
        if trial.number % 3 == 0:
            trial.report(float("inf"), 1)
        elif trial.number % 3 == 1:
            trial.report(float("-inf"), 1)
        else:
            trial.report(float("nan"), 1)

        if x > 0:
            raise optuna.TrialPruned()
        else:
            return x**2

    study.optimize(objective_single_inf_report, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single objective with reported nan value
    study = optuna.create_study(study_name="single-nan-report", storage=storage)

    def objective_single_nan_report(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        trial.report(0.5, step=0)
        trial.report(math.nan, step=1)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_single_nan_report, n_trials=100)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single-objective study with 1 parameter
    study = optuna.create_study(
        study_name="single-objective-1-param", storage=storage, direction="maximize"
    )

    def objective_single_with_1param(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        return -((x1 - 2) ** 2)

    study.optimize(objective_single_with_1param, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Single-objective study with 1 parameter
    study = optuna.create_study(study_name="long-parameter-names", storage=storage)

    def objective_long_parameter_names(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float(
            "x1_long_parameter_names_long_long_long_long_long_long_long_long_long_long", 0, 10
        )
        x2 = trial.suggest_float(
            "x2_long_parameter_names_long_long_long_long_long_long_long_long_long_long", 0, 10
        )
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study.optimize(objective_long_parameter_names, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Multi-objective study
    study = optuna.create_study(
        study_name="multi-objective",
        storage=storage,
        directions=["minimize", "minimize"],
    )
    study.set_metric_names(["v0", "v1"])

    def objective_multi(trial: optuna.Trial) -> Tuple[float, float]:
        x = trial.suggest_float("x", 0, 5)
        y = trial.suggest_float("y", 0, 3)
        v0 = 4 * x**2 + 4 * y**2
        v1 = (x - 5) ** 2 + (y - 5) ** 2
        return v0, v1

    study.optimize(objective_multi, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Multi-objective study with dynamic search space
    study = optuna.create_study(
        study_name="multi-dynamic", storage=storage, directions=["minimize", "minimize"]
    )

    def objective_multi_dynamic(trial: optuna.Trial) -> Tuple[float, float]:
        category = trial.suggest_categorical("category", ["foo", "bar"])
        if category == "foo":
            x = trial.suggest_float("x1", 0, 5)
            y = trial.suggest_float("y1", 0, 3)
            v0 = 4 * x**2 + 4 * y**2
            v1 = (x - 5) ** 2 + (y - 5) ** 2
            return v0, v1
        else:
            x = trial.suggest_float("x2", 0, 5)
            y = trial.suggest_float("y2", 0, 3)
            v0 = 2 * x**2 + 2 * y**2
            v1 = (x - 2) ** 2 + (y - 3) ** 2
            return v0, v1

    study.optimize(objective_multi_dynamic, n_trials=50)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Pruning with no intermediate values
    study = optuna.create_study(study_name="binh-korn-function-with-constraints", storage=storage)

    def objective_prune_with_no_trials(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x**2 + y**2
        if v > 100:
            raise optuna.TrialPruned()
        return v

    study.optimize(objective_prune_with_no_trials, n_trials=100)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # With failed trials
    study = optuna.create_study(study_name="failed trials", storage=storage)

    def objective_sometimes_got_failed(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v = x**2 + y**2
        if v > 100:
            raise ValueError("unexpected error")
        return v

    study.optimize(objective_sometimes_got_failed, n_trials=100, catch=(Exception,))
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # No trials single-objective study
    study = optuna.create_study(study_name="no trials single-objective study", storage=storage)
    study.set_user_attr("foo", "bar")

    # study with waiting trials
    study = optuna.create_study(study_name="waiting-trials", storage=storage)
    study.enqueue_trial({"x": 0, "y": 10})
    study.enqueue_trial({"x": 10, "y": 20})

    # Study with Running Trials
    study = optuna.create_study(
        study_name="running-trials", storage=storage, directions=["minimize", "maximize"]
    )
    study.set_metric_names(["auc", "val_loss"])
    study.enqueue_trial({"x": 10, "y": "Foo"})
    study.ask({"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])})
    study.ask({"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])})

    # Single-objective study with constraints
    def constraints(trial: optuna.Trial) -> list[float]:
        return trial.user_attrs["constraint"]

    study = optuna.create_study(
        study_name="A single objective constraint optimization study",
        storage=storage,
        sampler=optuna.samplers.TPESampler(constraints_func=constraints),
    )

    def objective_constraints(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -15, 30)
        y = trial.suggest_float("y", -15, 30)
        v0 = 4 * x**2 + 4 * y**2
        trial.set_user_attr("constraint", [1000 - v0, x - 10, y - 10])
        return v0

    study.optimize(objective_constraints, n_trials=100)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]

    # Study with Running Trials
    study = optuna.create_study(
        study_name="objective-form-widgets",
        storage=storage,
        directions=["minimize", "minimize", "minimize", "minimize"],
    )
    study.set_metric_names(
        ["Slider Objective", "Good or Bad", "Text Input Objective", "Validation Loss"]
    )
    trial = study.ask(
        {"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])}
    )
    trial.set_user_attr("val_loss", 0.2)
    study.ask({"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])})
    trial.set_user_attr("val_loss", 0.5)

    # No trials multi-objective study
    optuna.create_study(
        study_name="no trials multi-objective study",
        storage=storage,
        directions=["minimize", "maximize"],
    )

    # Single-objective study with intermediate values
    study = optuna.create_study(study_name="intermediate-values", storage=storage)

    def objective_intermediate_values(trial: optuna.Trial) -> float:
        trial.report(trial.number, step=0)
        trial.report(trial.number + 1, step=1)
        return 0.0

    study.optimize(objective_intermediate_values, n_trials=10)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]
    trial = study.ask(
        {"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])}
    )  # To create a running trial
    trial.report(trial.number, step=0)
    trial.report(trial.number + 1, step=1)

    # Single-objective study with intermediate values and constraints
    def constraints(trial: optuna.Trial) -> list[float]:
        return trial.user_attrs["constraint"]

    study = optuna.create_study(
        study_name="intermediate-values-constraints",
        storage=storage,
        sampler=optuna.samplers.NSGAIISampler(constraints_func=constraints),
    )

    def objective_intermediate_values_constraints(trial: optuna.Trial) -> float:
        trial.set_user_attr("constraint", [trial.number % 2])

        trial.report(trial.number, step=0)
        trial.report(trial.number + 1, step=1)
        return 0.0

    study.optimize(objective_intermediate_values_constraints, n_trials=10)
    params_importances[study.study_name] = [
        get_param_importances(
            study,
            target=lambda trial: trial.values[objective_id],
            evaluator=PedAnovaImportanceEvaluator(),
        )
        for objective_id in range(len(study.directions))
    ]
    trial = study.ask(
        {"x": FloatDistribution(0, 10), "y": CategoricalDistribution(["Foo", "Bar"])}
    )  # To create a running trial
    trial.report(trial.number, step=0)
    trial.report(trial.number + 1, step=1)

    # optuna-dashboard issue 410
    # https://github.com/optuna/optuna-dashboard/issues/410
    study = optuna.create_study(
        study_name="optuna-dashboard-issue-410",
        storage=storage,
        sampler=optuna.samplers.RandomSampler(),
    )

    def objective_issue_410(trial: optuna.Trial) -> float:
        trial.suggest_categorical("resample_rate", ["50ms"])
        trial.suggest_categorical("channels", ["all"])
        trial.suggest_categorical("window_size", [256])
        if trial.number > 15:
            raise Exception("Unexpected error")
        trial.suggest_categorical("cbow", [True])
        trial.suggest_categorical("model", ["m1"])

        trial.set_user_attr("epochs", 0)
        trial.set_user_attr("deterministic", True)
        if trial.number > 10:
            raise Exception("unexpeccted error")
        trial.set_user_attr("folder", "/path/to/folder")
        trial.set_user_attr("resample_type", "foo")
        trial.set_user_attr("run_id", "0001")
        return 1.0

    study.optimize(objective_issue_410, n_trials=20, catch=(Exception,))


def main() -> None:
    remove_assets()
    storage = JournalStorage(JournalFileStorage(os.path.join(BASE_DIR, "journal.log")))
    params_importances: dict[str, dict[str, float]] = {}
    create_optuna_storage(storage, params_importances)

    with open(os.path.join(BASE_DIR, "params_importances.json"), "w") as f:
        json.dump(params_importances, f, indent=2)


if __name__ == "__main__":
    main()
