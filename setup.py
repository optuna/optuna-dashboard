import os
import sys
import types
from typing import List
from setuptools import setup, find_packages
from importlib.machinery import SourceFileLoader

BASE_PATH = os.path.dirname(__file__)


def get_long_description() -> str:
    readme_filepath = os.path.join(BASE_PATH, "README.md")
    with open(readme_filepath) as f:
        return f.read()


def get_version() -> int:
    version_filepath = os.path.join(BASE_PATH, "optuna_dashboard", "version.py")
    module_name = "version"
    target_module = types.ModuleType(module_name)
    loader = SourceFileLoader(module_name, version_filepath)
    loader.exec_module(target_module)
    return getattr(target_module, "__version__")


def get_install_requires() -> List[str]:
    deps = ["optuna>=2.4", "bottle"]
    if sys.version_info[:2] < (3, 8):
        deps.append("typing-extensions")
    return deps


setup(
    name="optuna-dashboard",
    version=get_version(),
    description="Real-time dashboard for Optuna.",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    author="Masashi Shibata",
    author_email="m.shibata1020@gmail.com",
    url="https://github.com/c-bata/optuna-dashboard",
    packages=find_packages(),
    install_requires=get_install_requires(),
    extras_require={
        "lint": ["black", "flake8", "mypy"],
        "release": ["wheel", "twine"],
    },
    package_data={"optuna_dashboard": ["public/*"]},
    entry_points={
        "console_scripts": [
            "optuna-dashboard = optuna_dashboard.cli:main",
        ],
    },
)
