import tempfile

from optuna.artifacts import FileSystemArtifactStore
import pytest

from optuna_dashboard._config import create_artifact_store_from_config
from optuna_dashboard._config import create_llm_provider_from_config
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
