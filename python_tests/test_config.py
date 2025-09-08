import argparse
import tempfile

from optuna.artifacts import FileSystemArtifactStore
import pytest

from optuna_dashboard._config import create_artifact_store_from_config
from optuna_dashboard._config import create_llm_provider_from_config
from optuna_dashboard._config import DashboardConfig
from optuna_dashboard._config import load_config_from_toml
from optuna_dashboard.llm.openai import OpenAI


def test_load_config() -> None:
    config_content = """
[optuna_dashboard]
storage = "sqlite:///test.db"
port = 9090
host = "127.0.0.1"
server = "gunicorn"

[llm.openai]
model = "gpt-4o"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        config = load_config_from_toml(f.name)

        assert config["optuna_dashboard"]["storage"] == "sqlite:///test.db"
        assert config["optuna_dashboard"]["port"] == 9090
        assert config["optuna_dashboard"]["host"] == "127.0.0.1"
        assert config["optuna_dashboard"]["server"] == "gunicorn"
        assert config["llm"]["openai"]["model"] == "gpt-4o"


def test_invalid_toml_syntax() -> None:
    config_content = """
[optuna_dashboard
storage = "invalid
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        with pytest.raises(ValueError, match="Failed to read configuration file"):
            load_config_from_toml(f.name)


def test_create_artifact_store_from_config() -> None:
    config_content = """
[optuna_dashboard]
storage = "sqlite:///test.db"

[artifact_store.filesystem]
base_path = "/tmp/artifacts"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        config = load_config_from_toml(f.name)
    artifact_store = create_artifact_store_from_config(config)
    assert isinstance(artifact_store, FileSystemArtifactStore)


def test_create_llm_provider_from_config() -> None:
    config_content = """
[optuna_dashboard]
storage = "sqlite:///test.db"

[llm.openai]
model = "dummy-model"

[llm.openai.client]
api_key = "sk-dummy"
base_url = "https://openai.example.com/"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        config = load_config_from_toml(f.name)
    llm_provider = create_llm_provider_from_config(config)
    assert isinstance(llm_provider, OpenAI)


def test_dashboard_config_defaults() -> None:
    config = DashboardConfig()
    assert config.port == 8080
    assert config.host == "127.0.0.1"
    assert config.server == "auto"
    assert config.storage is None
    assert config.quiet is False


def test_build_from_sources_cli_priority() -> None:
    args = argparse.Namespace(
        storage="sqlite:///cli.db",
        port=9999,
        host=None,
        server=None,
        quiet=None,
        storage_class=None,
        artifact_dir=None,
    )
    toml_config = {
        "optuna_dashboard": {
            "storage": "mysql://localhost/optuna",
            "port": 8888,
            "host": "toml-host",
        }
    }

    config = DashboardConfig.build_from_sources(args, toml_config)
    assert config.storage == "sqlite:///cli.db"
    assert config.port == 9999
    assert config.host == "toml-host"  # TOML used when CLI is None.
    assert config.server == "auto"  # default value is used.


def test_build_from_sources_toml_fallback() -> None:
    args = argparse.Namespace(
        storage=None,
        port=None,
        host=None,
        server=None,
        quiet=None,
        storage_class=None,
        artifact_dir=None,
    )
    toml_config = {
        "optuna_dashboard": {
            "storage": "mysql://localhost/optuna",
            "port": 8888,
            "server": "gunicorn",
        }
    }

    config = DashboardConfig.build_from_sources(args, toml_config)
    assert config.storage == "mysql://localhost/optuna"
    assert config.port == 8888
    assert config.server == "gunicorn"
    assert config.host == "127.0.0.1"  # default value is used.


def test_build_from_sources_defaults() -> None:
    args = argparse.Namespace(
        storage="sqlite:///tmp.db",
        port=None,
        host=None,
        server=None,
        quiet=None,
        storage_class=None,
        artifact_dir=None,
    )

    config = DashboardConfig.build_from_sources(args, None)
    assert config.storage == "sqlite:///tmp.db"  # storage is required.
    assert config.port == 8080
    assert config.host == "127.0.0.1"
    assert config.server == "auto"
