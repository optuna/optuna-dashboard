Configuration
=============

Optuna Dashboard supports TOML configuration files for managing complex settings that would be cumbersome to specify via command-line arguments.

Basic Usage
-----------

.. code-block:: console

    $ optuna-dashboard --from-config config.toml

Configuration File Structure
----------------------------

Dashboard Settings
~~~~~~~~~~~~~~~~~~

Settings that can be specified via command-line options can also be configured in TOML files.
Configuration file settings are overridden by command-line arguments.

.. code-block:: toml

    [optuna_dashboard]
    storage = "sqlite:///example.db"
    storage_class = "RDBStorage"
    port = 8080
    host = "127.0.0.1"
    server = "auto"


.. _configuration-llm-integration:

LLM Integration
~~~~~~~~~~~~~~~

To enable LLM Integration, configure the LLM Provider.

OpenAI
^^^^^^

Configure OpenAI or OpenAI-compatible API.

The ``llm.openai`` configuration specifies the model name and API type.
When ``use_chat_completions_api`` is set to ``true``, the `OpenAI Chat Completions API <https://platform.openai.com/docs/api-reference/chat>`__ will be used; setting it to ``false`` will use the `Responses API <https://platform.openai.com/docs/api-reference/responses/create>`__.

The ``llm.openai.client`` configuration specifies the OpenAI API key and endpoint, which are passed to the constructor of the `openai.OpenAI <https://github.com/openai/openai-python>`__ class.

.. warning::
    Configuration files may contain sensitive information (e.g., API keys and endpoints).
    You can use environment variables  (e.g., ``export OPENAI_API_KEY=your_api_key``) in your shell to avoid hardcoding them.


.. code-block:: toml

    [llm.openai]
    model = "gpt-5-mini"
    use_chat_completions_api = true

    [llm.openai.client]
    api_key = "sk-your-api-key"
    base_url = "https://api.openai.example.com/v1"

Azure OpenAI
^^^^^^^^^^^^

Configure Azure OpenAI API.

Just as with the OpenAI section, configure Azure OpenAI using ``llm.azure_openai``.

.. code-block:: toml

    [llm.azure_openai]
    model = "gpt-5-mini"
    use_chat_completions_api = true

    [llm.azure_openai.client]
    api_key = "your-azure-api-key"
    azure_endpoint = "https://your-resource.openai.azure.example.com/"
    api_version = "2024-02-15-preview"

Artifact Storage
~~~~~~~~~~~~~~~~

You can configure an artifact storage backend to store artifacts generated during the optimization process.
Refer to the `optuna.artifacts <https://optuna.readthedocs.io/en/stable/reference/artifacts.html>`__ for detailed configuration options.

AWS S3 (Boto3)
^^^^^^^^^^^^^^

.. code-block:: toml

    [artifact_store.boto3]
    bucket_name = "my-optuna-artifacts"

Google Cloud Storage
^^^^^^^^^^^^^^^^^^^^

.. code-block:: toml

    [artifact_store.gcs]
    bucket_name = "my-optuna-artifacts"

Local Filesystem
^^^^^^^^^^^^^^^^

.. code-block:: toml

    [artifact_store.filesystem]
    base_path = "/path/to/artifacts"


Complete Example
----------------

.. code-block:: toml

    [optuna_dashboard]
    storage = "mysql://user:pass@localhost/optuna"
    port = 8080
    host = "127.0.0.1"

    [llm.openai]
    model = "gpt-5-mini"

    [llm.openai.client]
    api_key = "sk-your-openai-key"

    [artifact_store.filesystem]
    base_path = "/path/to/artifacts"

Priority Order
--------------

Configuration values are applied in the following order (higher priority overrides lower):

1. **Command-line arguments** (highest priority)
2. **Configuration file** (``--from-config``)
3. **Default values** (lowest priority)
