import json
from unittest import TestCase

import optuna
from optuna import get_all_study_summaries
from optuna_dashboard._app import create_app

from .wsgi_client import send_request


def objective(trial: optuna.trial.Trial) -> float:
    x = trial.suggest_float("x", -1, 1)
    return x


class APITestCase(TestCase):
    def test_get_study_summaries(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo1")
        storage.create_new_study("foo2")

        app = create_app(storage)
        status, _, body = send_request(
            app,
            "/api/studies/",
            "GET",
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        study_summaries = json.loads(body)["study_summaries"]
        self.assertEqual(len(study_summaries), 2)

    def test_get_study_details_without_after_param(self) -> None:
        study = optuna.create_study()
        study_id = study._study_id
        study.optimize(objective, n_trials=2)
        app = create_app(study._storage)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 2)

    def test_get_study_details_with_after_param_partial(self) -> None:
        study = optuna.create_study()
        study_id = study._study_id
        study.optimize(objective, n_trials=2)
        app = create_app(study._storage)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"after": "1"},
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 1)

    def test_get_study_details_with_after_param_full(self) -> None:
        study = optuna.create_study()
        study_id = study._study_id
        study.optimize(objective, n_trials=2)
        app = create_app(study._storage)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"after": "2"},
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 0)

    def test_get_study_details_with_after_param_illegal(self) -> None:
        study = optuna.create_study()
        study_id = study._study_id
        study.optimize(objective, n_trials=2)
        app = create_app(study._storage)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"after": "-1"},
            content_type="application/json",
        )
        self.assertEqual(status, 400)

    def test_create_study(self) -> None:
        for name, directions, expected_status in [
            ("single-objective success", ["minimize"], 201),
            ("multi-objective success", ["minimize", "maximize"], 201),
            ("invalid direction name", ["invalid-direction", "maximize"], 400),
        ]:
            with self.subTest(name):
                storage = optuna.storages.InMemoryStorage()
                self.assertEqual(len(get_all_study_summaries(storage)), 0)

                app = create_app(storage)
                request_body = {
                    "study_name": "foo",
                    "directions": directions,
                }
                status, _, _ = send_request(
                    app,
                    "/api/studies",
                    "POST",
                    content_type="application/json",
                    body=json.dumps(request_body),
                )
                self.assertEqual(status, expected_status)

                if expected_status == 201:
                    self.assertEqual(len(get_all_study_summaries(storage)), 1)
                else:
                    self.assertEqual(len(get_all_study_summaries(storage)), 0)

    def test_create_study_duplicated(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo")
        self.assertEqual(len(get_all_study_summaries(storage)), 1)

        app = create_app(storage)
        request_body = {
            "study_name": "foo",
            "direction": "minimize",
        }
        status, _, _ = send_request(
            app,
            "/api/studies",
            "POST",
            content_type="application/json",
            body=json.dumps(request_body),
        )
        self.assertEqual(status, 400)
        self.assertEqual(len(get_all_study_summaries(storage)), 1)

    def test_delete_study(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo1")
        storage.create_new_study("foo2")
        self.assertEqual(len(get_all_study_summaries(storage)), 2)

        app = create_app(storage)
        status, _, _ = send_request(
            app,
            "/api/studies/1",
            "DELETE",
            content_type="application/json",
        )
        self.assertEqual(status, 204)
        self.assertEqual(len(get_all_study_summaries(storage)), 1)

    def test_delete_study_not_found(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        app = create_app(storage)
        status, _, _ = send_request(
            app,
            "/api/studies/1",
            "DELETE",
            content_type="application/json",
        )
        self.assertEqual(status, 404)


class BottleRequestHookTestCase(TestCase):
    def test_ignore_trailing_slashes(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        app = create_app(storage)

        endpoints = ["/api/studies", "/api/studies/"]
        for endpoint in endpoints:
            with self.subTest(msg=endpoint):
                status, _, body = send_request(
                    app,
                    endpoint,
                    "GET",
                    content_type="application/json",
                )
                self.assertEqual(status, 200)
