import json
from typing import Dict, Optional, Any
from unittest import TestCase

import optuna
from .wsgi_utils import create_wsgi_env, send_request, WSGIEnv
from optuna_dashboard.app import create_app


def create_json_api_wsgi_env(
    path: str,
    method: str,
    json_body: Optional[Dict[str, Any]] = None,
    content_type: str = "application/json",
    headers: Optional[Dict[str, str]] = None,
) -> WSGIEnv:
    body = json.dumps(json_body) if json_body else ""
    return create_wsgi_env(
        path, method, body, content_type=content_type, headers=headers
    )


class APITestCase(TestCase):
    def test_create_study(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        self.assertEqual(len(storage.get_all_study_summaries()), 0)

        app = create_app(storage)
        env = create_json_api_wsgi_env(
            "/api/studies",
            "POST",
            json_body={
                "study_name": "foo",
                "direction": "minimize",
            },
        )
        status, _, _ = send_request(app, env)
        self.assertEqual(status, "201 Created")
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

    def test_create_study_duplicated(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo")
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

        app = create_app(storage)
        env = create_json_api_wsgi_env(
            "/api/studies",
            "POST",
            json_body={
                "study_name": "foo",
                "direction": "minimize",
            },
        )
        status, _, _ = send_request(app, env)
        self.assertEqual(status, "400 Bad Request")
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

    def test_delete_study(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        storage.create_new_study("foo1")
        storage.create_new_study("foo2")
        self.assertEqual(len(storage.get_all_study_summaries()), 2)

        app = create_app(storage)
        env = create_json_api_wsgi_env(
            "/api/studies/1",
            "DELETE",
        )
        status, _, _ = send_request(app, env)
        self.assertEqual(status, "204 No Content")
        self.assertEqual(len(storage.get_all_study_summaries()), 1)

    def test_delete_study_not_found(self) -> None:
        storage = optuna.storages.InMemoryStorage()
        app = create_app(storage)
        env = create_json_api_wsgi_env(
            "/api/studies/1",
            "DELETE",
        )
        status, _, _ = send_request(app, env)
        self.assertEqual(status, "404 Not Found")
