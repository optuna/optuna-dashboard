Error Messages
==============

This section lists descriptions and background for common error messages and warnings raised or emitted by Optuna Dashboard.

Warning Messages
----------------

Human-in-the-loop optimization will not work with ``_CachedStorage`` in Optuna prior to v3.2.
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This warning occurs when the storage object associated with the Optuna Study is of the ``_CachedStorage`` class.

When using ``RDBStorage`` with Optuna, it is implicitly wrapped with the ``_CachedStorage`` class for performance improvement.
However, there is a bug in the ``_CachedStorage`` class that prevents Optuna from synchronizing the latest Trial information.
This bug is not a problem for the general use case of Optuna, but it is critical for human-in-the-loop optimization.

If you are using a version prior to v3.2, please upgrade to v3.2 or later, use another storage classes,
or use a following dirty hack to unwrap ``_CachedStorage`` class.

.. code-block:: python

   if isinstance(study._storage, optuna.storages._CachedStorage):
       study._storage = study._storage._backend
