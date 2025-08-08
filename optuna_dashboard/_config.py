from __future__ import annotations

import sys
from typing import Any
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from optuna.artifacts._protocol import ArtifactStore

    from .llm.provider import LLMProvider


if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib


def load_config_from_toml(config_path: str) -> dict[str, Any]:
    """Load configuration from TOML file.

    Args:
        config_path: Path to the TOML configuration file

    Returns:
        Dictionary containing configuration values

    Raises:
        ValueError: If the TOML file is malformed or missing required section
    """
    try:
        with open(config_path, "rb") as f:
            config = tomllib.load(f)
    except Exception as e:
        raise ValueError(f"Failed to read configuration file '{config_path}': {e}")

    return config


def create_llm_provider_from_config(config: dict[str, Any]) -> LLMProvider | None:
    if "llm" not in config:
        return None

    llm_config = config["llm"]

    if "openai" in llm_config:
        import optuna_dashboard.llm.openai
        import openai

        client = openai.OpenAI(**llm_config["openai"]["client"])
        return optuna_dashboard.llm.openai.OpenAI(
            client,
            model=llm_config["openai"]["model"],
            use_chat_completions_api=llm_config["openai"].get("use_chat_completions_api", False),
        )
    elif "azure_openai" in llm_config:
        import optuna_dashboard.llm.openai
        import openai

        client = openai.AzureOpenAI(**llm_config["azure_openai"]["client"])
        return optuna_dashboard.llm.openai.AzureOpenAI(
            client,
            model=llm_config["azure_openai"]["model"],
            use_chat_completions_api=llm_config["azure_openai"].get(
                "use_chat_completions_api", False
            ),
        )
    else:
        raise ValueError(
            "Unsupported LLM provider. Supported providers: 'openai', 'azure_openai'."
        )


def create_artifact_store_from_config(config: dict[str, Any]) -> ArtifactStore | None:
    if "artifact_store" not in config:
        return None

    artifact_store: ArtifactStore | None = None
    if "boto3" in config["artifact_store"]:
        from optuna.artifacts import Boto3ArtifactStore

        artifact_store = Boto3ArtifactStore(**config["artifact_store"]["boto3"])
    elif "gcs" in config["artifact_store"]:
        from optuna.artifacts import GCSArtifactStore

        artifact_store = GCSArtifactStore(**config["artifact_store"]["gcs"])
    elif "filesystem" in config["artifact_store"]:
        from optuna.artifacts import FileSystemArtifactStore

        artifact_store = FileSystemArtifactStore(**config["artifact_store"]["filesystem"])
    else:
        raise ValueError("Unsupported artifact store configuration.")

    return artifact_store
