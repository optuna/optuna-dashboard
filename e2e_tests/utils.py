from optuna_dashboard._storage import trials_cache
from optuna_dashboard._storage import trials_cache_lock
from optuna_dashboard._storage import trials_last_fetched_at


def clear_inmemory_cache() -> None:
    with trials_cache_lock:
        trials_cache.clear()
        trials_last_fetched_at.clear()
