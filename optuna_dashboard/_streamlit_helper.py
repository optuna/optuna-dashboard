from __future__ import annotations

import optuna
from optuna.trial import FrozenTrial
import streamlit as st

from ._form_widget import get_form_widgets_json
from ._note import get_note_from_system_attrs


def render_trial_note(study: optuna.Study, trial: FrozenTrial) -> None:
    """Write a trial note to UI as a markdown format.

    Args:
        study: The optuna study object.
        trial: The optuna trial object to get note.
    """
    note = get_note_from_system_attrs(study.system_attrs, trial._trial_id)
    st.markdown(note["body"], unsafe_allow_html=True)


def render_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI.

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to tell user feedbacks.
    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        return

    st.write("## Objective Form Widgets")

    widgets = form_widgets_dict["widgets"]
    values = []
    with st.form("user_input", clear_on_submit=False):
        for widget in widgets:
            if widget["type"] == "choice":
                value = st.radio(
                    widget["description"],
                    widget["values"],
                    format_func=lambda choice: widget["choices"][
                        widget["values"].index(choice)
                    ],  # noqa: B023
                    horizontal=True,
                )
                values.append(value)
            elif widget["type"] == "slider":
                # NOTE: It is difficult to reflect "labels.
                value = st.slider(
                    widget["description"],
                    min_value=widget["min"],
                    max_value=widget["max"],
                    step=widget["step"],
                )
                values.append(value)
            elif widget["type"] == "text":
                # TODO (kaitos): It is better to consider "optional".
                value = st.text_input(widget["description"])
                values.append(value)
            elif widget["type"] == "user_attr":
                value = trial.user_attrs[widget["key"]]
                values.append(value)
            else:
                raise ValueError("Unsupported widget type.")
        submitted = st.form_submit_button("Submit")

    storage = study._storage
    output_type = form_widgets_dict["output_type"]
    if submitted:
        if output_type == "objective":
            study.tell(trial.number, values)
        elif output_type == "user_attr":
            for widget, value in zip(widgets, values):
                storage.set_trial_user_attr(
                    trial._trial_id, key=widget["user_attr_key"], value=value
                )
        else:
            st.warning("Detect unsupported output_type")
        st.success("Feedback submitted!")
