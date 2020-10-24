import os
from setuptools import setup, find_packages


def get_long_description() -> str:
    readme_filepath = os.path.join(os.path.dirname(__file__), "README.md")
    with open(readme_filepath) as f:
        return f.read()

setup(
    name="optuna-dashboard",
    version="0.0.2",
    description="Web dashboard for Optuna.",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    author="Masashi Shibata",
    author_email="m.shibata1020@gmail.com",
    url="https://github.com/c-bata/optuna-dashboard",
    packages=find_packages(),
    install_requires=["optuna", "bottle"],
    extras_require={
        "lint": ["black", "flake8"],
        "release": ["wheel", "twine"],
    },
    package_data={"optuna_dashboard": ["public/*"]},
    entry_points={
        "console_scripts": [
            "optuna-dashboard = optuna_dashboard.cli:main",
        ],
    },
)
