from __future__ import annotations

from typing import TYPE_CHECKING

import optuna
from optuna.trial import FrozenTrial
import streamlit as st

from .._form_widget import get_form_widgets_json
from .._note import get_note_from_system_attrs


if TYPE_CHECKING:
    from typing import Sequence

    from .._form_widget import ChoiceWidgetJSON
    from .._form_widget import SliderWidgetJSON
    from .._form_widget import TextInputWidgetJSON
    from .._form_widget import UserAttrRefJSON


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


def _format_description(description: str | None) -> str:
    return "" if description is None else description


def _render_widgets(
    widgets: Sequence[ChoiceWidgetJSON | SliderWidgetJSON | TextInputWidgetJSON | UserAttrRefJSON],
    trial: FrozenTrial,
) -> tuple[bool, list[str | float | None]]:
    values: list[str | float | None] = []

    with st.form("user_input", clear_on_submit=False):
        for widget in widgets:
            if widget["type"] == "choice":
                value = st.radio(
                    _format_description(widget["description"]),
                    widget["values"],
                    format_func=lambda choice, widget=widget: _format_choice(  # type: ignore
                        choice, widget
                    ),
                    horizontal=True,
                )
            elif widget["type"] == "slider":
                # NOTE: It is difficult to reflect "labels".
                value = st.slider(
                    _format_description(widget["description"]),
                    min_value=widget["min"],
                    max_value=widget["max"],
                    step=widget["step"],
                )
            elif widget["type"] == "text":
                # NOTE: Current implementation ignores "optional".
                value = st.text_input(_format_description(widget["description"]))
            elif widget["type"] == "user_attr":
                value = trial.user_attrs[widget["key"]]
            else:
                raise ValueError(
                    "Widget type should be 'choice', 'slider', 'text', or 'user_attr'."
                )
            values.append(value)
        submitted = st.form_submit_button("Submit")
    return submitted, values


def render_user_attr_form_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI with streamlit.

    Submitted values to the forms are registered as each trial's user_attrs.

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to save user feedbacks.

    Raises:
        ValueError: If No form widgets registered.
        ValueError: If 'output_type' of form widgets is not 'user_attr'.

    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        raise ValueError("No form widgets registered.")

    if form_widgets_dict["output_type"] != "user_attr":
        raise ValueError("'output_type' should be 'user_attr'.")

    widgets = form_widgets_dict["widgets"]
    submitted, values = _render_widgets(widgets, trial)

    if submitted:
        for widget, value in zip(widgets, values):
            if "user_attr_key" in widget.keys():
                study._storage.set_trial_user_attr(
                    trial._trial_id, key=widget["user_attr_key"], value=value  # type: ignore
                )

        st.success("Submitted!")


def render_objective_form_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI with streamlit.

    Submitted values to the forms are telled to optuna trial object.
    All submitted values should be float.
    Multiple widgets correspond to multi-objective optimization.

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to tell user feedbacks.

    Raises:
        ValueError: If No form widgets registered.
        ValueError: If 'output_type' of form widgets is not 'objective'.
        ValueError: If any submitted values cannot be converted to float.
    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        raise ValueError("No form widgets registered.")

    if form_widgets_dict["output_type"] != "objective":
        raise ValueError("'output_type' should be 'objective'.")

    submitted, values = _render_widgets(form_widgets_dict["widgets"], trial)

    if submitted:
        values_float = []
        for value in values:
            try:
                values_float.append(float(value))  # type: ignore
            except ValueError as e:
                raise ValueError("All submitted values should be float.") from e
        study.tell(trial.number, values_float)
        st.success("Submitted!")
