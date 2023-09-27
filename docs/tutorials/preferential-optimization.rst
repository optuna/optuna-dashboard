Tutorial: Preferential Optimization
===================================

What is Preferential Optimization?
----------------------------------

Preferential optimization is a method for optimizing hyperparameters, focusing of human preferences, by determining which trial is superior when comparing a pair.
It differs from `human-in-the-loop optimization utilizing objective form widgets <tutorial-hitl-objective-form-widgets>`_,
which relies on absolute evaluations, as it significantly reduces fluctuations in evaluators' criteria, thus ensuring more consistent results.

In this tutorial, we'll interactively optimize RGB values to generate a color resembling a "sunset hue",
aligining with the problem setting in `this tutorial <tutorial-hitl-objective-form-widgets>`_.
Familiarity with the tutorial ob objective form widgets may enhance your understanding.

How to Run Preferential Optimization
------------------------------------

In preferential optimization, two programs run concurrently: `generator.py`_ performing parameter sampling and image generation,
and the Optuna Dashboard, offering a user interface for human evaluation.

.. figure:: ./images/preferential-optimization/system-architecture.png
   :alt: System Architecture
   :align: center
   :width: 800px

First, ensure the necessary packages are installed by executing the following command in your terminal:

.. code-block:: console

    $ pip install "optuna>=3.3.0" "optuna-dashboard>=0.13.0b1" pillow botorch

Next, execute the Python script, copied from `generator.py`_.

.. code-block:: console

   $ python generator.py

Then, launch Optuna Dashboard in a separate process using the following command.

.. code-block:: console

    $ optuna-dashboard sqlite:///example.db --artifact-dir ./artifact

Here, the storage is configured to ``sqlite:///example.db`` to retain Optuna's trial history,
and ``--artifact-dir ./artifact`` is specified to store the artifacts (output images).

.. code-block:: console

    Listening on http://127.0.0.1:8080/
    Hit Ctrl-C to quit.

Upon executing the command, a message like the above will appear.
Open `http://127.0.0.1:8080/dashboard/ <http://127.0.0.1:8080/dashboard/>`_ in your browser to view the Optuna Dashboard:

.. figure:: ./images/preferential-optimization/anim.gif
   :alt: GIF animation for preferential optimization
   :align: center
   :width: 800px

   Select the least sunset-like color from four trials to record human preferences.


Script Explanation
------------------

First, we specify the SQLite database URL and initialize the artifact store to house the images produced during the trial.

.. code-block:: python
   :linenos:

   STORAGE_URL = "sqlite:///example.db"
   artifact_path = os.path.join(os.path.dirname(__file__), "artifact")
   artifact_store = FileSystemArtifactStore(base_path=artifact_path)
   os.makedirs(artifact_path, exist_ok=True)

Within the ``main()`` function, creating dedicated ``Study`` and ``Sampler`` objects since preferential optimization relies on the comparison results between trials, lacking absolute evaluation values for each one.

Then, the component to be displayed on the human feedback pages is registered via :func:`~optuna_dashboard.register_preference_feedback_component`.
The generated images are uploaded to the artifact store, and their ``artifact_id`` is stored in the trial user attribute (e.g., ``trial.user_attrs["rgb_image"]``),
enabling the Optuna Dashboard to display images on the evaluation feedback page.

.. code-block:: python
   :linenos:

   from optuna_dashboard import register_preference_feedback_component
   from optuna_dashboard.preferential import create_study
   from optuna_dashboard.preferential.samplers.gp import PreferentialGPSampler

   study = create_study(
       n_generate=4,
       study_name="Preferential Optimization",
       storage=STORAGE_URL,
       sampler=PreferentialGPSampler(),
       load_if_exists=True,
   )
   # Change the component, displayed on the human feedback pages.
   # By default (component_type="note"), the Trial's Markdown note is displayed.
   user_attr_key = "rgb_image"
   register_preference_feedback_component(study, "artifact", user_attr_key)

Following this, we create a loop that continuously checks if new trials should be generated, awaiting human evaluation if not.
Within the while loop, new trials are generated if the condition :meth:`~optuna_dashboard.preferential.PreferentialStudy.should_generate` returns ``True``. 
For each trial, RGB values are sampled, an image is generated with these values, saved temporarily.
Then the image is uploaded to the artifact store, and finally, the ``artifact_id`` is stored to the key, which is specified via :func:`~optuna_dashboard.register_preference_feedback_component`.

.. code-block:: python
   :linenos:

   while True:
       # If study.should_generate() returns False, the generator waits for human evaluation.
       if not study.should_generate():
           time.sleep(0.1)  # Avoid busy-loop
           continue

       trial = study.ask()
       # Ask new parameters
       r = trial.suggest_int("r", 0, 255)
       g = trial.suggest_int("g", 0, 255)
       b = trial.suggest_int("b", 0, 255)

       # Generate an image
       image_path = os.path.join(tmpdir, f"sample-{trial.number}.png")
       image = Image.new("RGB", (320, 240), color=(r, g, b))
       image.save(image_path)

       # Upload Artifact and set artifact_id to trial.user_attrs["rgb_image"].
       artifact_id = upload_artifact(trial, image_path, artifact_store)
       trial.set_user_attr(user_attr_key, artifact_id)

.. _generator.py: https://github.com/optuna/optuna-dashboard/blob/main/examples/preferential-optimization/generator.py
