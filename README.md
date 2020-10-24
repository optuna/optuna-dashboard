# optuna-dashboard

Realtime Web dashboard for Optuna. Code files were originally taken from [Goptuna](https://github.com/c-bata/goptuna).

![demo](https://user-images.githubusercontent.com/5564044/97078684-ba98a180-1628-11eb-8245-7cb8c76647f5.gif)

## Usage

You can install optuna-dashboard via pip.

```console
$ pip install optuna-dashboard
```

After you installed, `optuna-dashboard` command is available.
Please execute it with Optuna storage URL.

```
$ optuna-dashboard sqlite:///db.sqlite3
Bottle v0.12.18 server starting up (using WSGIRefServer())...
Listening on http://localhost:8080/
Hit Ctrl-C to quit.
```

<details>

<summary>More command line options</summary>

```
$ optuna-dashboard --help
usage: optuna-dashboard [-h] [--port PORT] [--host HOST] [--quiet] storage

A third-party dashboard for optuna.

positional arguments:
  storage      Optuna Storage URL

optional arguments:
  -h, --help   show this help message and exit
  --port PORT  port number (default: 8080)
  --host HOST  hostname (default: 'localhost')
  --quiet      quiet
```

</details>

## Alternatives

* [optdash](https://github.com/ytsmiling/optdash): a third-party dashboard for optuna.
