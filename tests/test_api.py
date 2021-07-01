import json
from unittest import TestCase

import optuna

from optuna_dashboard.app import create_app

from .wsgi_client import send_request


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

    def test_get_study_details(self) -> None:
        def objective(trial):
            x = trial.suggest_float("x", -1, 1)
            return x

        study = optuna.create_study()
        study_id = study._study_id
        study.optimize(objective, n_trials=10)
        app = create_app(study._storage)

        # query without before parameter
        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 10)

        # query with before parameter
        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"before": 5},
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 5)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"before": 10},
            content_type="application/json",
        )
        self.assertEqual(status, 200)
        all_trials = json.loads(body)["trials"]
        self.assertEqual(len(all_trials), 0)

        status, _, body = send_request(
            app,
            f"/api/studies/{study_id}",
            "GET",
            queries={"before": -1},
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
                self.assertEqual(len(storage.get_all_study_summaries()), 0)

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
                    self.assertEqual(len(storage.get_all_study_summaries()), 1)
                else:
                    self.assertEqual(len(storage.get_all_study_summaries()), 0)

    def test_create_study_duplicated(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo")
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

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
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

    def test_delete_study(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo1")
        storage.create_new_study("foo2")
        self.assertEqual(len(storage.get_all_study_summaries()), 2)

        app = create_app(storage)
        status, _, _ = send_request(
            app,
            "/api/studies/1",
            "DELETE",
            content_type="application/json",
        )
        self.assertEqual(status, 204)
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

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
