import tempfile

import pytest

from optuna_dashboard._config import load_config_from_toml


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


def test_load_config_with_all_sections() -> None:
    config_content = """
[optuna_dashboard]
storage = "sqlite:///test.db"

[llm.openai]
model = "gpt-4o"

[llm.openai.client]
api_key = "sk-openai"

[llm.azure_openai]
model = "gpt-o3"

[llm.azure_openai.client]
azure_endpoint = "https://openai.azure.example.com/"

[artifact_store.filesystem]
base_path = "/tmp/artifacts"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        config = load_config_from_toml(f.name)

        assert config["optuna_dashboard"]["storage"] == "sqlite:///test.db"
        assert config["llm"]["openai"]["model"] == "gpt-4o"
        assert config["llm"]["openai"]["client"]["api_key"] == "sk-openai"
        assert config["llm"]["azure_openai"]["model"] == "gpt-o3"
        assert (
            config["llm"]["azure_openai"]["client"]["azure_endpoint"]
            == "https://openai.azure.example.com/"
        )
        assert config["artifact_store"]["filesystem"]["base_path"] == "/tmp/artifacts"


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


def test_empty_file() -> None:
    config_content = ""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        config = load_config_from_toml(f.name)
        assert config == {}
