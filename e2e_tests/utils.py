from optuna_dashboard._storage import trials_cache
from optuna_dashboard._storage import trials_cache_lock


def clear_inmemory_cache() -> None:
    with trials_cache_lock:
        trials_cache.clear()
