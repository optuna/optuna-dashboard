import re

import optuna
from optuna.trial import TrialState
from optuna_dashboard import ChoiceWidget
from optuna_dashboard import register_objective_form_widgets
from playwright.sync_api import expect
from playwright.sync_api import Page
import pytest

from ...test_server import make_test_server
from ...utils import clear_inmemory_cache


def make_test_storage() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()
    sampler = optuna.samplers.RandomSampler(seed=0)

    study = optuna.create_study(
        study_name="preferential_optimization",
        storage=storage,
        sampler=sampler,
    )

    register_objective_form_widgets(
        study,
        widgets=[
            ChoiceWidget(
                choices=["Good", "So-so", "Bad"],
                values=[-1, 0, 1],
            ),
        ],
    )

    n_batch = 4
    while True:
        running_trials = study.get_trials(deepcopy=False, states=(TrialState.RUNNING,))
        if len(running_trials) >= n_batch:
            break
        study.ask()

    return storage


@pytest.fixture
def storage() -> optuna.storages.InMemoryStorage:
    clear_inmemory_cache()
    storage = make_test_storage()
    return storage


@pytest.fixture
def server_url(request: pytest.FixtureRequest, storage: optuna.storages.InMemoryStorage) -> str:
    return make_test_server(request, storage)


def test_preferential_optimization(
    page: Page,
    storage: optuna.storages.InMemoryStorage,
    server_url: str,
) -> None:
    summaries = optuna.get_all_study_summaries(storage)
    study_id = summaries[0]._study_id
    url = f"{server_url}/studies/{study_id}/trials"

    page.goto(url)

    # Confirm that the trial list page is displayed.
    expect(page.get_by_role("heading").filter(has_text=re.compile("Trial"))).to_contain_text(
        "Trial 0 (trial_id=0)"
    )
    page.get_by_label("Filter").click()
    # Confirm that all trials are running.
    expect(
        page.get_by_text("Complete (0)Pruned (0)Fail (0)Running (4)Waiting (0)")
    ).to_be_visible()
    page.locator(".MuiBackdrop-root").click()

    # Confirm that the trial detail page is displayed.
    expect(page.get_by_role("heading").filter(has_text=re.compile("Trial"))).to_contain_text(
        "Trial 0 (trial_id=0)"
    )
    # This trial is running.
    expect(page.get_by_text("Running", exact=True).nth(4)).to_be_visible()
    page.get_by_label("Bad").check()
    page.get_by_role("button", name="Submit").click()
    # This trial is completed and is the best trial.
    expect(page.get_by_text("Complete").nth(1)).to_be_visible()
    expect(page.get_by_text("Best Trial").nth(1)).to_be_visible()

    # Move the next trial page.
    page.get_by_role("button", name="Trial 1 Running").click()
    # Confirm that the trial detail page is displayed.
    expect(page.get_by_role("heading").filter(has_text=re.compile("Trial"))).to_contain_text(
        "Trial 1 (trial_id=1)"
    )
    # This trial is running.
    expect(page.get_by_text("Running", exact=True).nth(3)).to_be_visible()
    page.get_by_label("So-so").check()
    page.get_by_role("button", name="Submit").click()
    # This trial is completed and is the best trial.
    expect(page.get_by_text("Complete").nth(2)).to_be_visible()
    expect(page.get_by_text("Best Trial").nth(1)).to_be_visible()

    # Move the next trial page.
    page.get_by_role("button", name="Trial 2 Running").click()
    # Confirm that the trial detail page is displayed.
    expect(page.get_by_role("heading").filter(has_text=re.compile("Trial"))).to_contain_text(
        "Trial 2 (trial_id=2)"
    )
    # This trial is running.
    expect(page.get_by_text("Running", exact=True).nth(2)).to_be_visible()
    page.get_by_label("Good").check()
    page.get_by_role("button", name="Submit").click()
    # This trial is completed and is the best trial.
    expect(page.get_by_text("Complete").nth(3)).to_be_visible()
    expect(page.get_by_text("Best Trial").nth(1)).to_be_visible()

    # Move the next trial page.
    page.get_by_role("button", name="Trial 3 Running").click()
    # Confirm that the trial detail page is displayed.
    expect(page.get_by_role("heading").filter(has_text=re.compile("Trial"))).to_contain_text(
        "Trial 3 (trial_id=3)"
    )
    # This trial is running.
    expect(page.get_by_text("Running", exact=True).nth(1)).to_be_visible()
    page.get_by_role("button", name="Fail Trial").click()
    # This trial is failed.
    expect(page.get_by_text("Fail").nth(1)).to_be_visible()
