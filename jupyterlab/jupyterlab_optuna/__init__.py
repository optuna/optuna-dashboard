try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode:
    # https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings

    warnings.warn("Importing 'jupyterlab_optuna' outside a proper installation.")
    __version__ = "dev"

import os
import sys


# Force import of `jupyterlab_optuna.vendor.optuna_dashboard`, instead of
# `optuna_dashboard` installed by pip.
vendor_path = os.path.join(os.path.dirname(__file__), "vendor")
if vendor_path not in sys.path:
    sys.path.insert(0, vendor_path)

from .handlers import setup_handlers  # NOQA


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "jupyterlab-optuna"}]


def _jupyter_server_extension_points():
    return [{"module": "jupyterlab_optuna"}]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    setup_handlers(server_app.web_app)
    name = "jupyterlab_optuna"
    server_app.log.info(f"Registered {name} server extension")
