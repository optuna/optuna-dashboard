# optuna-dashboard

![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)

Real-time dashboard for [Optuna](https://github.com/optuna/optuna).
Code files were originally taken from [Goptuna](https://github.com/c-bata/goptuna).

## Usage

You can install optuna-dashboard via pip.

```console
$ pip install optuna-dashboard
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

You can create and delete a study from Dashboard.

![optuna-create-delete-study](https://user-images.githubusercontent.com/5564044/97099702-4107be80-16cf-11eb-9d97-f5ceec98ce52.gif)

### Visualize with interactive graphs

Interactive live-updating graphs for optimization history, parallel coordinate and intermediate values.

![optuna-realtime-graph](https://user-images.githubusercontent.com/5564044/97099797-66e19300-16d0-11eb-826c-6977e3941fb0.gif)

### Rich trials data grid

You can walk-through trials by filtering and sorting.

![optuna-trial-table](https://user-images.githubusercontent.com/5564044/97099599-36005e80-16ce-11eb-929c-8498f6ea09da.gif)

## Submitting patches

If you want to contribute, please check [Developers Guide](./DEVELOPMENT.md).


## Alternatives

* ['optuna dashboard' subcommand](https://optuna.readthedocs.io/en/stable/reference/cli.html#dashboard): Official Optuna dashboard based on Bokeh CLI.
* [ytsmiling/optdash](https://github.com/ytsmiling/optdash): a third-party dashboard for optuna.
