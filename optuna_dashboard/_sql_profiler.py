import copy
import threading
from time import perf_counter
from typing import Any
from typing import Dict
from typing import List
from typing import Tuple
from typing import TYPE_CHECKING

from bottle import Bottle
from bottle import SimpleTemplate
from optuna.storages import RDBStorage
from sqlalchemy import event

from optuna_dashboard._app import BottleView


if TYPE_CHECKING:
    from sqlalchemy.engine.base import Engine

sql_queries_lock = threading.Lock()
sql_queries: Dict[str, Tuple[int, List[float], List[Dict[str, Any]]]] = {}
sql_queries_template = SimpleTemplate(
    """<!DOCTYPE html>
<html lang="en">
<head>
<title>SQL Profiler - Optuna Dashboard</title>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body {
    padding: 30px;
    margin: 0;
}
</style>
</head>
<body>
  <h1>Slow Profiler</h1>
  <h2>Sort by Total Time</h2>
  <table border="1">
    <thead>
      <tr>
        <th>Total Time (s)</th>
        <th>Query Count</th>
        <th>Statement</th>
      </tr>
    </thead>
    <tbody>
      %for query in sort_by_total:
      <tr>
        <td>{{ query[2] }}</th>
        <td>{{ query[1] }}</th>
        <td>{{ query[0] }}</th>
      </tr>
      %end
    </tbody>
  </table>
  <h2>Sort by Count</h2>
  <table border="1">
    <thead>
      <tr>
        <th>Query Count</th>
        <th>Total Time (s)</th>
        <th>Statement</th>
      </tr>
    </thead>
    <tbody>
      %for query in sort_by_count:
      <tr>
        <td>{{ query[1] }}</th>
        <td>{{ query[2] }}</th>
        <td>{{ query[0] }}</th>
      </tr>
      %end
    </tbody>
  </table>
</body>
</html>"""  # noqa: E501
)


class EngineDebuggingSignalEvents:
    """Sets up handlers for two events that let us track the execution time of
    queries."""

    def __init__(self, engine: "Engine") -> None:
        self.engine = engine
        self.query_start_time = perf_counter()

    def register(self) -> None:
        event.listen(self.engine, "before_cursor_execute", self.before_cursor_execute)
        event.listen(self.engine, "after_cursor_execute", self.after_cursor_execute)

    def before_cursor_execute(  # type: ignore
        self, conn, cursor, statement, parameters, context, executemany
    ) -> None:
        self.query_start_time = perf_counter()

    def after_cursor_execute(  # type: ignore
        self, conn, cursor, stmt, parameters, context, executemany
    ) -> None:
        duration = perf_counter() - self.query_start_time
        with sql_queries_lock:
            registered = stmt in sql_queries
            sql_queries[stmt] = (
                sql_queries[stmt][0] + 1 if registered else 1,
                sql_queries[stmt][1] + [duration] if registered else [duration],
                sql_queries[stmt][2] + [parameters] if registered else [parameters],
            )


def register_profiler_view(app: Bottle, storage: RDBStorage) -> Bottle:
    EngineDebuggingSignalEvents(storage.engine).register()

    @app.get("/sql-profiler")
    def profile_sql_queries() -> BottleView:
        global sql_queries
        with sql_queries_lock:
            summary = [
                (stmt, count, f"{sum(durations):.4f}", sum(durations))
                for stmt, (count, durations, _) in sql_queries.items()
            ]

            sorted(summary, key=lambda r: r[3], reverse=True)
            sort_by_total = copy.deepcopy(summary[:5])

            sorted(summary, key=lambda r: r[1], reverse=True)
            sort_by_count = copy.deepcopy(summary[:5])

            res = sql_queries_template.render(
                sort_by_total=sort_by_total, sort_by_count=sort_by_count
            )
            sql_queries = {}
        return res

    return app
