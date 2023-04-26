Getting Started
===============

Installation
------------

Prerequisite
~~~~~~~~~~~~

Optuna Dashboard supports Python 3.7 or newer.


Installing from PyPi
~~~~~~~~~~~~~~~~~~~~

You can install optuna-dashboard via `PyPI <https://pypi.org/project/optuna-dashboard/>`_ or `Anaconda Cloud <https://anaconda.org/conda-forge/optuna-dashboard>`_.

.. code-block:: console

    $ pip install optuna-dashboard

Also, you can install following optional dependencies to make optuna-dashboard faster.

.. code-block:: console

   $ pip install optuna-fast-fanova gunicorn

Installing from the source code
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Since it requires to build TypeScript files, ``pip install git+https://.../optuna-dashboard.git`` does not actually work.
Please clone the git repository and execute following commands to build sdist package:

.. code-block:: console

   $ git clone git@github.com:optuna/optuna.git
   $ cd optuna

.. code-block:: console

   # Node.js v16 is required to compile TypeScript files.
   $ npm install
   $ npm run build:prd
   $ python setup.py sdist

Then you can install it like:

.. code-block:: console

   $ pip install dist/optuna-dashboard-x.y.z.tar.gz

See `CONTRIBUTING.md <https://github.com/optuna/optuna/blob/master/CONTRIBUTING.md>`_ for more details.


Command-line Interface
----------------------

The most common usage of Optuna Dashboard is using the command-line interface.
Assuming that Optuna's optimization history is persisted using ``RDBStorage``,
you can use the command line interface like ``optuna-dashboard <STORAGE_URL>``.

.. code-block:: python

    import optuna

    def objective(trial):
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    study = optuna.create_study(
        storage="sqlite:///db.sqlite3",  # Specify the storage URL here.
        study_name="quadratic-simple"
    )
    study.optimize(objective, n_trials=100)
    print(f"Best value: {study.best_value} (params: {study.best_params})")


.. code-block:: console

   $ optuna-dashboard sqlite:///db.sqlite3
   Listening on http://localhost:8080/
   Hit Ctrl-C to quit.

If you are using JournalStorage classes introduced in Optuna v3.1, you can use them like below:

.. code-block:: console

   # JournalFileStorage
   $ optuna-dashboard ./path/to/journal.log

   # JournalRedisStorage
   $ optuna-dashboard redis://localhost:6379


Using an official Docker image
------------------------------

You can also use `an official Docker image <https://github.com/optuna/optuna-dashboard/pkgs/container/optuna-dashboard>`_ instead of setting up your Python environment.
The Docker image only supports SQLite3, MySQL(PyMySQL), and PostgreSQL(Psycopg2).

**SQLite3**

.. code-block:: console

   $ docker run -it --rm -p 8080:8080 -v `pwd`:/app -w /app ghcr.io/optuna/optuna-dashboard sqlite:///db.sqlite3


**MySQL (PyMySQL)**

.. code-block:: console

   $ docker run -it --rm -p 8080:8080 ghcr.io/optuna/optuna-dashboard mysql+pymysql://username:password@hostname:3306/dbname

**PostgreSQL (Psycopg2)**

.. code-block:: console

   $ docker run -it --rm -p 8080:8080 ghcr.io/optuna/optuna-dashboard postgresql+psycopg2://username:password@hostname:5432/dbname

Python Interface
----------------

Python interfaces are also provided for users who want to use other storage implementations (e.g. ``InMemoryStorage``).
You can use :func:`~optuna_dashboard.run_server` function like below:

.. code-block:: python

    import optuna
    from optuna_dashboard import run_server

    def objective(trial):
        x = trial.suggest_float("x", -100, 100)
        y = trial.suggest_categorical("y", [-1, 0, 1])
        return x**2 + y

    storage = optuna.storages.InMemoryStorage()
    study = optuna.create_study(storage=storage)
    study.optimize(objective, n_trials=100)

    run_server(storage)


Using Gunicorn or uWSGI server
------------------------------

Optuna Dashboard uses `wsgiref <https://docs.python.org/3/library/wsgiref.html>`_ module, which is in the Python's standard libraries, by default.
However, as described `here <https://github.com/python/cpython/blob/v3.11.0/Lib/wsgiref/simple_server.py#L3-L7>`_, ``wsgiref`` is implemented for testing or debugging purpose.
You can switch to other WSGI server implementations by using :func:`~optuna_dashboard.wsgi` function.

.. code-block:: python

   :caption: wsgi.py

   from optuna.storages import RDBStorage
   from optuna_dashboard import wsgi

   storage = RDBStorage("sqlite:///db.sqlite3")
   application = wsgi(storage)

Then please execute following commands to start.

.. code-block:: console

   $ pip install gunicorn
   $ gunicorn --workers 4 wsgi:application

or

.. code-block:: console

   $ pip install uwsgi
   $ uwsgi --http :8080 --workeers 4 --wsgi-file wsgi.py


Google Colaboratory
-------------------

When you want to check the optimization history on Google Colaboratory,
you can use ``google.colab.output()`` function as follows:

.. code-block:: python

   import optuna
   import threading
   from google.colab import output
   from optuna_dashboard import run_server

   def objective(trial):
       x = trial.suggest_float("x", -100, 100)
       return (x - 2) ** 2

   # Run optimization
   storage = optuna.storages.InMemoryStorage()
   study = optuna.create_study(storage=storage)
   study.optimize(objective, n_trials=100)

   # Start Optuna Dashboard
   port = 8081
   thread = threading.Thread(target=run_server, args=(storage,), kwargs={"port": port})
   thread.start()
   output.serve_kernel_port_as_window(port, path='/dashboard/')

Then please open http://localhost:8081/dashboard to browse.
