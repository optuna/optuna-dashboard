import os
import textwrap
import time
from typing import NoReturn

import optuna
from PIL import Image
from optuna.trial import TrialState

from optuna_dashboard import ObjectiveChoiceWidget, save_note
from optuna_dashboard import register_objective_form_widgets
from optuna_dashboard import set_objective_names
from optuna_dashboard.artifact import get_artifact_path, upload_artifact
from optuna_dashboard.artifact.file_system import FileSystemBackend


def suggest_and_generate_image(study: optuna.Study, artifact_backend: FileSystemBackend) -> None:
    # Ask new parameters
    trial = study.ask()
    r = trial.suggest_int("r", 0, 255)
    g = trial.suggest_int("g", 0, 255)
    b = trial.suggest_int("b", 0, 255)

    # Generate image
    image_path = f"tmp/sample-{trial.number}.png"
    image = Image.new("RGB", (320, 240), color=(r, g, b))
    image.save(image_path)

    # Upload Artifact
    artifact_id = upload_artifact(artifact_backend, trial, image_path)
    artifact_path = get_artifact_path(trial, artifact_id)

    # Save Note
    note = textwrap.dedent(
        f"""\
    ## Trial {trial.number}

    ![generated-image]({artifact_path})
    """
    )
    save_note(trial, note)


def start_preferential_optimization(
    storage: optuna.storages.BaseStorage, artifact_backend: FileSystemBackend
) -> NoReturn:
    # Create Study
    sampler = optuna.samplers.TPESampler(constant_liar=True)
    study = optuna.create_study(
        study_name="Human-in-the-loop Optimization",
        storage=storage,
        sampler=sampler,
        load_if_exists=True,
    )
    orig_storage = study._storage
    if isinstance(orig_storage, optuna.storages._cached_storage._CachedStorage):
        study._storage = orig_storage._backend

    set_objective_names(study, ["Looks like sunset color?"])
    register_objective_form_widgets(
        study,
        widgets=[
            ObjectiveChoiceWidget(
                choices=["Good 👍", "So-so👌", "Bad 👎"],
                values=[-1, 0, 1],
                description="Please input your score!",
            ),
        ],
    )

    # Start Preferential Optimization
    n_batch = 4
    while True:
        running_trials = study.get_trials(deepcopy=False, states=(TrialState.RUNNING,))
        if len(running_trials) >= n_batch:
            continue
        suggest_and_generate_image(study, artifact_backend)


def main() -> NoReturn:
    url = "sqlite:///db.sqlite3"
    storage = optuna.storages.RDBStorage(url=url)
    tmp_path = os.path.join(os.path.dirname(__file__), "tmp")
    artifact_path = os.path.join(os.path.dirname(__file__), "artifact")
    artifact_backend = FileSystemBackend(base_path=artifact_path)

    if not os.path.exists(artifact_path):
        os.mkdir(artifact_path)

    if not os.path.exists(tmp_path):
        os.mkdir(tmp_path)

    # Run optimize loop
    start_preferential_optimization(storage, artifact_backend)


if __name__ == "__main__":
    main()
