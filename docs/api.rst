.. module:: optuna_dashboard

API Reference
=============

General APIs
------------

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.run_server
   optuna_dashboard.wsgi
   optuna_dashboard.set_objective_names
   optuna_dashboard.save_note

Human-in-the-loop
-----------------

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.register_objective_form_widgets
   optuna_dashboard.dict_to_form_widget
   optuna_dashboard.ChoiceWidget
   optuna_dashboard.SliderWidget
   optuna_dashboard.TextInputWidget
   optuna_dashboard.ObjectiveUserAttrRef

Artifact
--------

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.artifact.upload_artifact
   optuna_dashboard.artifact.file_system.FileSystemBackend
   optuna_dashboard.artifact.boto3.Boto3Backend
