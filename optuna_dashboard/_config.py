from __future__ import annotations

import sys
from typing import Any

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
