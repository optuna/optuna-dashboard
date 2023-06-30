from __future__ import annotations

import optuna
from optuna.trial import FrozenTrial
import streamlit as st

from ._form_widget import ChoiceWidgetJSON
from ._form_widget import get_form_widgets_json
from ._form_widget import SliderWidgetJSON
from ._form_widget import TextInputWidgetJSON
from ._note import get_note_from_system_attrs


def render_trial_note(study: optuna.Study, trial: FrozenTrial) -> None:
    """Write a trial note to UI with streamlit as a markdown format.

    Args:
        study: The optuna study object.
        trial: The optuna trial object to get note.
    """
    note = get_note_from_system_attrs(study.system_attrs, trial._trial_id)
    st.markdown(note["body"], unsafe_allow_html=True)


def _format_choice(choice: float, widget: ChoiceWidgetJSON) -> str:
    return widget["choices"][widget["values"].index(choice)]


def _render_widgets(
    widgets: list[ChoiceWidgetJSON | SliderWidgetJSON | TextInputWidgetJSON],
) -> tuple[bool, list[str | float]]:
    values = []
    with st.form("user_input", clear_on_submit=False):
        for widget in widgets:
            if widget["description"] is None:
                description = ""
            else:
                description = widget["description"]

            if widget["type"] == "choice":
                value = st.radio(
                    description,
                    widget["values"],
                    format_func=lambda choice, widget=widget: _format_choice(  # type: ignore
                        choice, widget
                    ),
                    horizontal=True,
                )
                values.append(value)
            elif widget["type"] == "slider":
                # NOTE: It is difficult to reflect "labels".
                value = st.slider(
                    description,
                    min_value=widget["min"],
                    max_value=widget["max"],
                    step=widget["step"],
                )
                values.append(value)
            elif widget["type"] == "text":
                # NOTE: Current implementation ignores "optional".
                value = st.text_input(description)
                values.append(value)
            else:
                raise ValueError("Widget type should be 'choice', 'slider' or 'text'.")
        submitted = st.form_submit_button("Submit")
    return submitted, values


def render_user_attr_form_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI with streamlit.

    Submitted values to the forms are registered as each trial's user_attrs.
    "type" of widgets should be "choice", "slider", or "text".

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to save user feedbacks.

    Raises:
        ValueError: If No form widgets registered.
        ValueError: If 'output_type' of form widgets is not 'user_attr'.
        ValueError: If any widget['type'] is not in ['choice', 'slider', 'text'].
        ValueError: if any widget does not have 'user_attr_key'.

    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        raise ValueError("No form widgets registered.")

    if form_widgets_dict["output_type"] != "user_attr":
        raise ValueError("'output_type' should be 'user_attr'.")

    widgets = form_widgets_dict["widgets"]
    for widget in widgets:
        if widget["type"] not in ["choice", "slider", "text"]:
            raise ValueError("Widget type should be 'choice', 'slider' or 'text'.")
        if widget["user_attr_key"] is None:  # type: ignore
            raise ValueError("Widget should have 'user_attr_key'.")

    submitted, values = _render_widgets(widget)  # type: ignore

    if submitted:
        for widget, value in zip(widgets, values):
            study._storage.set_trial_user_attr(
                trial._trial_id, key=widget["user_attr_key"], value=value  # type: ignore
            )

        st.success("Submitted!")


def render_objective_form_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI with streamlit.

    Submitted values to the forms are telled to optuna trial object.
    "type" of widgets should be "choice" or "slider".
    Multiple widgets correspond to multi-objective optimization.

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to tell user feedbacks.

    Raises:
        ValueError: If No form widgets registered.
        ValueError: If 'output_type' of form widgets is not 'objective'.
        ValueError: If any widget['type'] is not in ['choice', 'slider'].
    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        raise ValueError("No form widgets registered.")

    if form_widgets_dict["output_type"] != "user_attr":
        raise ValueError("'output_type' should be 'user_attr'.")

    widgets = form_widgets_dict["widgets"]
    for widget in widgets:
        if widget["type"] not in ["choice", "slider"]:
            raise ValueError("Widget type should be 'choice' or 'slider'.")

    submitted, values = _render_widgets(widgets)  # type: ignore

    if submitted:
        study.tell(trial.number, values)  # type: ignore
        st.success("Submitted!")
