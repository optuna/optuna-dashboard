import itertools
from typing import Sequence

import optuna
from optuna_dashboard import ChoiceWidget
from optuna_dashboard import register_objective_form_widgets
from optuna_dashboard import register_user_attr_form_widgets
from optuna_dashboard import save_note
from optuna_dashboard import SliderWidget
from optuna_dashboard import TextInputWidget
from optuna_dashboard.streamlit import render_objective_form_widgets
from optuna_dashboard.streamlit import render_trial_note
from optuna_dashboard.streamlit import render_user_attr_form_widgets
import pytest


@pytest.mark.parametrize("note", ["test", ""])
def test_render_trial_note(note: str) -> None:
    study = optuna.create_study()

    trial = study.ask()
    save_note(trial, note)

    render_trial_note(study, study.trials[0])


def test_render_trial_note_without_note() -> None:
    study = optuna.create_study()

    study.ask()

    render_trial_note(study, study.trials[0])


widget_list = [
    ChoiceWidget(
        choices=["Good", "Bad"],
        values=[1, -1],
        description="description",
        user_attr_key="choice",
    ),
    SliderWidget(
        min=1,
        max=5,
        step=1,
        labels=[(1, "Bad"), (5, "Good")],
        description="description",
        user_attr_key="slider",
    ),
    TextInputWidget(description="description", user_attr_key="text1"),
    TextInputWidget(description="description", user_attr_key="text2"),
]

widgets_combinations_for_user_attr = []
# Test widget combinations.
for r in range(len(widget_list) + 1):
    widgets_combinations_for_user_attr += list(itertools.combinations(widget_list, r))


@pytest.mark.parametrize("widgets", widgets_combinations_for_user_attr)
def test_render_user_attr_form_widgets(
    widgets: Sequence[ChoiceWidget | SliderWidget | TextInputWidget],
) -> None:
    study = optuna.create_study()
    register_user_attr_form_widgets(study, widgets)  # type: ignore

    study.ask()
    render_user_attr_form_widgets(study, study.trials[0])


widgets_combinations_for_objective = []
# Test widget combinations.
for r in range(1, len(widget_list) + 1):
    widgets_combinations_for_objective += list(itertools.combinations(widget_list, r))


@pytest.mark.parametrize("widgets", widgets_combinations_for_objective)
def test_render_objective_form_widgets(
    widgets: Sequence[ChoiceWidget | SliderWidget | TextInputWidget],
) -> None:
    study = optuna.create_study(directions=["maximize"] * len(widgets))
    register_objective_form_widgets(study, widgets)  # type: ignore

    study.ask()
    render_objective_form_widgets(study, study.trials[0])
