from __future__ import annotations

import optuna
from optuna_dashboard import _custom_plot_data as custom_plot_data
from optuna_dashboard import save_plotly_graph_object
import pytest


def get_dummy_study() -> optuna.Study:
    def objective(trial: optuna.Trial) -> float:
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    study = optuna.create_study()
    optuna.logging.set_verbosity(optuna.logging.ERROR)
    study.optimize(objective, n_trials=100)
    return study


def test_save_plotly_graph_object() -> None:
    # Save history plot
    dummy_study = get_dummy_study()
    plot_data = optuna.visualization.plot_optimization_history(dummy_study)
    graph_object_id = save_plotly_graph_object(dummy_study, plot_data)

    study_system_attrs = dummy_study._storage.get_study_system_attrs(dummy_study._study_id)
    plot_data_dict = custom_plot_data.get_plotly_graph_objects(study_system_attrs)
    assert len(plot_data_dict) == 1
    assert plot_data_dict[graph_object_id] == plot_data.to_json()

    # Save parallel coordinate plot
    plot_data = optuna.visualization.plot_parallel_coordinate(dummy_study)
    graph_object_id = save_plotly_graph_object(dummy_study, plot_data)

    study_system_attrs = dummy_study._storage.get_study_system_attrs(dummy_study._study_id)
    plot_data_dict = custom_plot_data.get_plotly_graph_objects(study_system_attrs)
    assert len(plot_data_dict) == 2
    assert plot_data_dict[graph_object_id] == plot_data.to_json()


def test_update_plotly_graph_object() -> None:
    # Save history plot
    dummy_study = get_dummy_study()
    plot_data = optuna.visualization.plot_optimization_history(dummy_study)
    graph_object_id = save_plotly_graph_object(dummy_study, plot_data)

    study_system_attrs = dummy_study._storage.get_study_system_attrs(dummy_study._study_id)
    plot_data_dict = custom_plot_data.get_plotly_graph_objects(study_system_attrs)
    assert len(plot_data_dict) == 1
    assert plot_data_dict[graph_object_id] == plot_data.to_json()

    # Save parallel coordinate plot
    plot_data = optuna.visualization.plot_parallel_coordinate(dummy_study)
    graph_object_id = save_plotly_graph_object(
        dummy_study, plot_data, graph_object_id=graph_object_id
    )

    study_system_attrs = dummy_study._storage.get_study_system_attrs(dummy_study._study_id)
    plot_data_dict = custom_plot_data.get_plotly_graph_objects(study_system_attrs)
    assert len(plot_data_dict) == 1
    assert plot_data_dict[graph_object_id] == plot_data.to_json()


@pytest.mark.parametrize(
    "name",
    [
        "0",
        "a",
        "a1-:_.",
    ],
)
def test_is_valid_graph_object_id(name: str) -> None:
    assert custom_plot_data.is_valid_graph_object_id(name)


@pytest.mark.parametrize(
    "name",
    [
        "a,",
        "a b",
        "aあいうえお",
    ],
)
def test_is_invalid_graph_object_id(name: str) -> None:
    assert not custom_plot_data.is_valid_graph_object_id(name)
