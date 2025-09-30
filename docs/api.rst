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
   optuna_dashboard.save_note
   optuna_dashboard.save_plotly_graph_object
   optuna_dashboard.artifact.get_artifact_path

LLM Providers
-------------

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.llm.openai.OpenAI
   optuna_dashboard.llm.openai.AzureOpenAI


Human-in-the-loop
-----------------

Form Widgets
~~~~~~~~~~~~

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.register_objective_form_widgets
   optuna_dashboard.register_user_attr_form_widgets
   optuna_dashboard.dict_to_form_widget
   optuna_dashboard.ChoiceWidget
   optuna_dashboard.SliderWidget
   optuna_dashboard.TextInputWidget
   optuna_dashboard.ObjectiveUserAttrRef

Preferential Optimization
~~~~~~~~~~~~~~~~~~~~~~~~~

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.preferential.create_study
   optuna_dashboard.preferential.load_study
   optuna_dashboard.preferential.PreferentialStudy
   optuna_dashboard.preferential.samplers.gp.PreferentialGPSampler
   optuna_dashboard.register_preference_feedback_component

Streamlit
-----------------

.. autosummary::
   :toctree: _generated/
   :nosignatures:

   optuna_dashboard.streamlit.render_trial_note
   optuna_dashboard.streamlit.render_objective_form_widgets
   optuna_dashboard.streamlit.render_user_attr_form_widgets
