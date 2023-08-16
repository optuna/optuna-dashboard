from __future__ import annotations

import os
import tempfile
import textwrap
import time
from typing import NoReturn

from optuna_dashboard import save_note
from optuna_dashboard.artifact import upload_artifact
from optuna_dashboard.artifact.file_system import FileSystemBackend
from optuna_dashboard.preferential import create_study
from optuna_dashboard.preferential.samplers._gp import PreferentialGPSampler
from PIL import Image


STORAGE_URL = "sqlite:///st-example.db"
artifact_path = os.path.join(os.path.dirname(__file__), "artifact")
artifact_backend = FileSystemBackend(base_path=artifact_path)
os.makedirs(artifact_path, exist_ok=True)

n_comparison = 5


def main() -> NoReturn:
    study = create_study(
        study_name="Preferential Optimization",
        storage=STORAGE_URL,
        sampler=PreferentialGPSampler(),
        load_if_exists=True,
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        while True:
            # If n_comparison "best" trials (that are not reported bad) exists,
            # the generator waits for human evaluation.
            if len(study.best_trials) >= n_comparison:
                time.sleep(0.1)  # Avoid busy-loop
                continue

            trial = study.ask()
            # 1. Ask new parameters
            r = trial.suggest_int("r", 0, 255)
            g = trial.suggest_int("g", 0, 255)
            b = trial.suggest_int("b", 0, 255)

            # 2. Generate image
            image_path = os.path.join(tmpdir, f"sample-{trial.number}.png")
            image = Image.new("RGB", (320, 240), color=(r, g, b))
            image.save(image_path)

            # 3. Upload Artifact
            artifact_id = upload_artifact(artifact_backend, trial, image_path)
            trial.set_user_attr("rgb_artifact_id", artifact_id)
            trial.set_user_attr("image_caption", f"(R, G, B) = ({r}, {g}, {b})")
            print("RGB:", (r, g, b))

            # 4. Save Note
            note = textwrap.dedent(
                f"""\
            ![generated-image]({artifact_path})
            (R, G, B) = ({r}, {g}, {b})
            """
            )
            save_note(trial, note)

            # 5. Mark comparison ready
            study.mark_comparison_ready(trial)


if __name__ == "__main__":
    main()
