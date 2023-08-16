from __future__ import annotations

import os
import shutil
import tempfile
import time
from typing import Callable
from typing import NoReturn
import uuid

from optuna_dashboard.artifact.file_system import FileSystemBackend
from optuna_dashboard.preferential import load_study

import streamlit as st


STORAGE_URL = "sqlite:///st-example.db"
artifact_path = os.path.join(os.path.dirname(__file__), "artifact")
artifact_backend = FileSystemBackend(base_path=artifact_path)
os.makedirs(artifact_path, exist_ok=True)

n_comparison = 5


def get_tmp_dir() -> str:
    if "tmp_dir" not in st.session_state:
        tmp_dir_name = str(uuid.uuid4())
        tmp_dir_path = os.path.join(tempfile.gettempdir(), tmp_dir_name)
        os.makedirs(tmp_dir_path, exist_ok=True)
        st.session_state.tmp_dir = tmp_dir_path

    return st.session_state.tmp_dir


def main() -> NoReturn:
    tmpdir = get_tmp_dir()
    study = load_study(
        study_name="Preferential Optimization",
        storage=STORAGE_URL,
    )

    # 1. Get all currently best trials (i.e. trials that are not reported bad) for comparison.
    comparison_trials = study.best_trials

    st.text("Which is the worst?")

    # 2. Show the artifact images of all those trials.
    cols = st.columns(n_comparison)
    finished_dict = {t.number: t for t in comparison_trials}

    col_is: dict[int, int] = st.session_state.get("col_is")
    if col_is is None:
        col_is = {}
    col_is = {tn: col_i for (tn, col_i) in col_is.items() if tn in finished_dict}

    unoccupied_col_is = [i for i in range(len(cols)) if i not in col_is.values()]
    for tn, col_i in zip([tn for tn in finished_dict if tn not in col_is], unoccupied_col_is):
        col_is[tn] = col_i
    st.session_state["col_is"] = col_is

    def on_click_factory(trial_number: int) -> Callable[[], None]:
        def on_click() -> None:
            better_trials = [t for t in comparison_trials if t.number != trial_number]
            worse_trial = finished_dict[trial_number]
            study.report_preference(better_trials, worse_trial)

        return on_click

    for trial_number, col_i in col_is.items():
        trial = finished_dict[trial_number]
        col = cols[col_i]

        rgb_artifact_id = trial.user_attrs["rgb_artifact_id"]
        image_caption = trial.user_attrs["image_caption"]
        with col:
            with artifact_backend.open(rgb_artifact_id) as fsrc:
                tmp_img_path = os.path.join(tmpdir, rgb_artifact_id + ".png")
                with open(tmp_img_path, "wb") as fdst:
                    shutil.copyfileobj(fsrc, fdst)
            st.image(tmp_img_path, caption=image_caption)
            st.button(str(trial_number), key=trial.number, on_click=on_click_factory(trial_number))

    for i, col in enumerate(st.columns(n_comparison)):
        if i >= len(comparison_trials):
            continue

    if len(comparison_trials) < n_comparison:
        # Wait for unfinished trials (images under generation) to be generated.
        time.sleep(0.1)
        st.experimental_rerun()


if __name__ == "__main__":
    main()
