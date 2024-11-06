from optuna_dashboard._cached_extra_study_property import cached_extra_study_property_cache
from optuna_dashboard._cached_extra_study_property import cached_extra_study_property_cache_lock
from optuna_dashboard._storage import trials_cache
from optuna_dashboard._storage import trials_cache_lock
from optuna_dashboard._storage import trials_last_fetched_at
from playwright.sync_api import Page


def clear_inmemory_cache() -> None:
    with trials_cache_lock:
        trials_cache.clear()
        trials_last_fetched_at.clear()
    with cached_extra_study_property_cache_lock:
        cached_extra_study_property_cache.clear()


def count_components(page: Page, component_name: str):
    component_count = page.evaluate(
        f"""() => {{
        const components = document.querySelectorAll('.{component_name}');
        return components.length;
    }}"""
    )
    return component_count
