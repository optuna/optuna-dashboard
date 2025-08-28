import tempfile

from optuna.artifacts import FileSystemArtifactStore
import pytest
from unittest.mock import patch, MagicMock

from optuna_dashboard._cli import main
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


def test_cli_args_override_config_file() -> None:
    """Test that CLI arguments override config file values."""
    config_content = """
[optuna_dashboard]
storage = "sqlite:///config.db"
port = 9000
host = "0.0.0.0"
server = "gunicorn"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        with patch("optuna_dashboard._cli.get_storage") as mock_get_storage, patch(
            "optuna_dashboard._cli.create_app"
        ) as mock_create_app, patch(
            "optuna_dashboard._cli.run_debug_server"
        ) as mock_run_debug_server, patch("optuna_dashboard._cli.DEBUG", True):
            # Setup mocks to prevent actual execution
            mock_storage = MagicMock()
            mock_get_storage.return_value = mock_storage
            mock_app = MagicMock()
            mock_create_app.return_value = mock_app
            mock_run_debug_server.return_value = None  # Prevent server startup

            test_args = [
                "--from-config",
                f.name,
                "--port",
                "8888",
                "--host",
                "127.0.0.1",
                "--server",
                "wsgiref",
                "sqlite:///cli.db",
            ]

            with patch("sys.argv", ["optuna-dashboard"] + test_args):
                main()

            # Verify CLI args took precedence
            mock_get_storage.assert_called_once_with("sqlite:///cli.db", storage_class=None)

            # Verify run_debug_server was called with CLI values
            mock_run_debug_server.assert_called_once_with(mock_app, "127.0.0.1", 8888, False)


def test_config_file_used_when_no_cli_override() -> None:
    """Test that config file values are used when no CLI override exists."""
    config_content = """
[optuna_dashboard]
storage = "sqlite:///config.db"
port = 9000
host = "0.0.0.0"
server = "wsgiref"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        with patch("optuna_dashboard._cli.get_storage") as mock_get_storage, patch(
            "optuna_dashboard._cli.create_app"
        ) as mock_create_app, patch(
            "optuna_dashboard._cli.run_debug_server"
        ) as mock_run_debug_server, patch("optuna_dashboard._cli.DEBUG", True):
            mock_storage = MagicMock()
            mock_get_storage.return_value = mock_storage
            mock_app = MagicMock()
            mock_create_app.return_value = mock_app
            mock_run_debug_server.return_value = None

            test_args = ["--from-config", f.name]

            with patch("sys.argv", ["optuna-dashboard"] + test_args):
                main()

            # Verify config file values were used rather than the default values
            mock_get_storage.assert_called_once_with("sqlite:///config.db", storage_class=None)
            mock_run_debug_server.assert_called_once_with(mock_app, "0.0.0.0", 9000, False)


def test_partial_cli_override() -> None:
    """Test partial override where some CLI args override config, others don't."""
    config_content = """
[optuna_dashboard]
storage = "sqlite:///config.db"
port = 9000
server = "wsgiref"
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".toml") as f:
        f.write(config_content)
        f.flush()

        with patch("optuna_dashboard._cli.get_storage") as mock_get_storage, patch(
            "optuna_dashboard._cli.create_app"
        ) as mock_create_app, patch(
            "optuna_dashboard._cli.run_debug_server"
        ) as mock_run_debug_server, patch("optuna_dashboard._cli.DEBUG", True):
            mock_storage = MagicMock()
            mock_get_storage.return_value = mock_storage
            mock_app = MagicMock()
            mock_create_app.return_value = mock_app
            mock_run_debug_server.return_value = None

            # Only override port, leave host and server from config
            test_args = ["--from-config", f.name, "--port", "7777"]

            with patch("sys.argv", ["optuna-dashboard"] + test_args):
                main()

            # Verify mixed values (storage from config, port from CLI, host from default)
            mock_get_storage.assert_called_once_with("sqlite:///config.db", storage_class=None)
            mock_run_debug_server.assert_called_once_with(mock_app, "127.0.0.1", 7777, False)
