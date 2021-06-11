# optuna-dashboard

![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square) [![PyPI - Downloads](https://img.shields.io/pypi/dm/optuna-dashboard)](https://pypistats.org/packages/optuna-dashboard)


Real-time dashboard for [Optuna](https://github.com/optuna/optuna).
Code files were originally taken from [Goptuna](https://github.com/c-bata/goptuna).

## Usage

You can install optuna-dashboard via [PyPI](https://pypi.org/project/optuna-dashboard/) or [conda-forge](https://anaconda.org/conda-forge/optuna-dashboard).

```
$ pip install optuna-dashboard
```

or

```
$ conda install -c conda-forge optuna-dashboard
```

Then please execute `optuna-dashboard` command with Optuna storage URL.

```
$ optuna-dashboard sqlite:///db.sqlite3
Bottle v0.12.18 server starting up (using WSGIRefServer())...
Listening on http://localhost:8080/
Hit Ctrl-C to quit.
```

<details>

<summary>more command line options</summary>

```console
$ optuna-dashboard -h
usage: optuna-dashboard [-h] [--port PORT] [--host HOST] [--version] [--quiet] storage

Real-time dashboard for Optuna.

positional arguments:
  storage        DB URL (e.g. sqlite:///example.db)

optional arguments:
  -h, --help     show this help message and exit
  --port PORT    port number (default: 8080)
  --host HOST    hostname (default: 127.0.0.1)
  --version, -v  show program's version number and exit
  --quiet, -q    quiet
```

</details>

## Features

### Manage studies

You can create and delete studies from Dashboard.

![optuna-dashboard-create-delete-study](https://user-images.githubusercontent.com/5564044/114265534-40b87100-9a2c-11eb-947f-02448809d8cd.gif)

### Visualize with interactive graphs

Interactive live-updating graphs for optimization history, parallel coordinate, intermediate values and hyperparameter importances.

![optuna-dashboard-realtime-graph](https://user-images.githubusercontent.com/5564044/114265619-d81dc400-9a2c-11eb-9a26-a4577574312e.gif)

### Rich trials data grid

You can walk-through trials by filtering and sorting.

![optuna-dashboard-trials-datagrid](https://user-images.githubusercontent.com/5564044/114265667-20d57d00-9a2d-11eb-8b9c-69541c9b4a28.gif)


## Submitting patches

If you want to contribute, please check [Developers Guide](./DEVELOPMENT.md).
