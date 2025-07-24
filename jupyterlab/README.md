# jupyterlab-optuna

A JupyterLab extension for [Optuna Dashboard](https://github.com/optuna/optuna-dashboard).

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab-optuna
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab-optuna
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

