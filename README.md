# optuna-dashboard

![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square) [![PyPI - Downloads](https://img.shields.io/pypi/dm/optuna-dashboard)](https://pypistats.org/packages/optuna-dashboard)


Real-time dashboard for [Optuna](https://github.com/optuna/optuna).
Code files were originally taken from [Goptuna](https://github.com/c-bata/goptuna).

## Getting Started

You can install optuna-dashboard via [PyPI](https://pypi.org/project/optuna-dashboard/) or [Anaconda Cloud](https://anaconda.org/conda-forge/optuna-dashboard).

```
$ pip install optuna-dashboard
```

And you can also install following optional dependencies to make optuna-dashboard faster.

```console
$ pip install optuna-fast-fanova gunicorn
```

Then please execute `optuna-dashboard` command with Optuna storage URL.

```
$ optuna-dashboard sqlite:///db.sqlite3
Listening on http://localhost:8080/
Hit Ctrl-C to quit.
```

<details>

<summary>More command line options</summary>

```console
$ optuna-dashboard -h
usage: optuna-dashboard [-h] [--port PORT] [--host HOST] [--version] [--quiet] storage

Real-time dashboard for Optuna.

positional arguments:
  storage        DB URL (e.g. sqlite:///example.db)

optional arguments:
  -h, --help            show this help message and exit
  --port PORT           port number (default: 8080)
  --host HOST           hostname (default: 127.0.0.1)
  --server {wsgiref,gunicorn}
                        server (default: auto)
  --version, -v         show program's version number and exit
  --quiet, -q           quiet
```

</details>

<details>

<summary>Python Interface</summary>

**`run_server(storage: Union[str, BaseStorage], host: str = 'localhost', port: int = 8080) -> None`**

Start running optuna-dashboard and blocks until the server terminates.
This function uses wsgiref module which is not intended for the production use.

**`wsgi(storage: Union[str, BaseStorage]) -> WSGIApplication`**

This function exposes WSGI interface for people who want to run on the
production-class WSGI servers like Gunicorn or uWSGI.

</details>

## Using an official Docker image

You can also use [an official Docker image](https://github.com/optuna/optuna-dashboard/pkgs/container/optuna-dashboard) instead of setting up your Python environment.
The Docker image only supports SQLite3, MySQL(PyMySQL), and PostgreSQL(Psycopg2).

```
$ docker run -it --rm -p 8080:8080 -v `pwd`:/app -w /app \
> ghcr.io/optuna/optuna-dashboard sqlite:///db.sqlite3
```

<details>
<summary>MySQL (PyMySQL)</summary>

```
$ docker run -it --rm -p 8080:8080 ghcr.io/optuna/optuna-dashboard mysql+pymysql://username:password@hostname:3306/dbname
```

</details>

<details>
<summary>PostgreSQL (Psycopg2)</summary>

```
$ docker run -it --rm -p 8080:8080 ghcr.io/optuna/optuna-dashboard postgresql+psycopg2://username:password@hostname:5432/dbname
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

If you want to contribute, please check [Developers Guide](./CONTRIBUTING.md).
