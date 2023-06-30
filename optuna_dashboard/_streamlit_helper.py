from __future__ import annotations

import optuna
from optuna.trial import FrozenTrial
import streamlit as st

from ._form_widget import get_form_widgets_json
from ._note import get_note_from_system_attrs


def render_trial_note(study: optuna.Study, trial: FrozenTrial) -> None:
    """Write a trial note to UI with streamlit as a markdown format.

    Args:
        study: The optuna study object.
        trial: The optuna trial object to get note.
    """
    note = get_note_from_system_attrs(study.system_attrs, trial._trial_id)
    st.markdown(note["body"], unsafe_allow_html=True)


def render_user_attr_form_widgets(study: optuna.Study, trial: FrozenTrial) -> None:
    """Render user input widgets to UI with streamlit.

    Submitted values to the forms are registered as each trial's user_attrs.

    Args:
        study: The optuna study object to get widget specification.
        trial: The optuna trial object to tell user feedbacks.

    Raises:
        ValueError: If No form widgets registered.
        ValueError: If 'output_type' of form widgets is not 'user_attr'.
        ValueError: If any widget["type"] is not in ["choice", "slider", "text"].
    """

    form_widgets_dict = get_form_widgets_json(study.system_attrs)
    if form_widgets_dict is None:
        raise ValueError("No form widgets registered.")

    if (
        "output_type" not in form_widgets_dict.keys()
        or form_widgets_dict["output_type"] != "user_attr"
    ):
        raise ValueError("'output_type' should be 'user_attr'.")

    widgets = form_widgets_dict["widgets"]
    values = []
    with st.form("user_input", clear_on_submit=False):
        for widget in widgets:
            if widget["description"] is None:  # type: ignore
                description = ""
            else:
                description = widget["description"]  # type: ignore
            if widget["type"] == "choice":
                value = st.radio(
                    description,
                    widget["values"],
                    format_func=lambda choice, widget=widget: widget["choices"][  # type: ignore
                        widget["values"].index(choice)
                    ],
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
                # TODO (kaitos): Resolve that current implementation ignores "optional"
                # (always optional on streamlit)
                values.append(st.text_input(description))
            else:
                raise ValueError("Widget type should be 'choice', 'slider', or 'text'.")
        submitted = st.form_submit_button("Submit")

    if submitted:
        for widget, value in zip(widgets, values):
            if widget["user_attr_key"] is not None:  # type: ignore
                study._storage.set_trial_user_attr(
                    trial._trial_id, key=widget["user_attr_key"], value=value  # type: ignore
                )

        st.success("Submitted!")
