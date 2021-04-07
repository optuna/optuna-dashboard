import asyncio
import optuna
import time
import threading

from optuna_dashboard.app import create_app
from pyppeteer import launch
from pyppeteer.browser import Browser
from wsgiref.simple_server import make_server

host = "127.0.0.1"
port = 8080


async def take_screenshot(
    browser: Browser, url: str, path: str, sleep_sec: int = 5
) -> None:
    page = await browser.newPage()
    await page.setViewport({"width": 1200, "height": 3000})
    await page.goto(url)
    time.sleep(sleep_sec)
    await page.screenshot({"path": path})


async def integration_test_main() -> None:
    browser = await launch()
    await take_screenshot(
        browser, f"http://{host}:{port}/dashboard/", "study_list.png", sleep_sec=1
    )
    await take_screenshot(
        browser, f"http://{host}:{port}/dashboard/studies/0", "study_detail_0.png"
    )
    await take_screenshot(
        browser, f"http://{host}:{port}/dashboard/studies/1", "study_detail_1.png"
    )
    await browser.close()


def run_optuna() -> optuna.storages.InMemoryStorage:
    storage = optuna.storages.InMemoryStorage()

    # study (study_id=0)
    study0 = optuna.create_study(study_name="example-0", storage=storage)

    def objective(trial: optuna.Trial) -> float:
        x1 = trial.suggest_float("x1", 0, 10)
        x2 = trial.suggest_float("x2", 0, 10)
        return (x1 - 2) ** 2 + (x2 - 5) ** 2

    study0.optimize(objective, n_trials=100)

    # study (study_id=1) with no trials
    optuna.create_study(study_name="example-1", storage=storage)
    return storage


def main() -> None:
    storage = run_optuna()
    app = create_app(storage)

    httpd = make_server(host, port, app)
    thread = threading.Thread(target=httpd.serve_forever)
    thread.start()

    asyncio.get_event_loop().run_until_complete(integration_test_main())

    httpd.shutdown()
    httpd.server_close()
    thread.join()


if __name__ == "__main__":
    main()
