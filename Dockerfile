FROM node:22 AS front-builder

# Keep pnpm non-interactive during Docker builds.
ENV CI=true
RUN corepack enable

WORKDIR /usr/src/optuna_dashboard
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /usr/src/optuna_dashboard/
COPY optuna_dashboard/package.json /usr/src/optuna_dashboard/optuna_dashboard/package.json
COPY standalone_app/package.json /usr/src/optuna_dashboard/standalone_app/package.json
COPY vscode/package.json /usr/src/optuna_dashboard/vscode/package.json
COPY tslib/types/package.json /usr/src/optuna_dashboard/tslib/types/package.json
COPY tslib/storage/package.json /usr/src/optuna_dashboard/tslib/storage/package.json
COPY tslib/react/package.json /usr/src/optuna_dashboard/tslib/react/package.json
RUN pnpm install --frozen-lockfile

COPY ./tslib/types/ /usr/src/optuna_dashboard/tslib/types/
COPY ./tslib/storage/ /usr/src/optuna_dashboard/tslib/storage/
COPY ./tslib/react/ /usr/src/optuna_dashboard/tslib/react/
COPY ./optuna_dashboard /usr/src/optuna_dashboard/optuna_dashboard
RUN pnpm --filter @optuna/types run build
RUN pnpm --filter @optuna/storage run build
RUN pnpm --filter @optuna/react run build
RUN pnpm --filter @optuna/optuna-dashboard run build:pkg
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm --filter @optuna/optuna-dashboard run build:prd

FROM python:3.12-bookworm AS python-builder

WORKDIR /usr/src
RUN pip install --upgrade pip setuptools
RUN pip install --progress-bar off PyMySQL[rsa] psycopg2-binary gunicorn

ADD ./pyproject.toml /usr/src/pyproject.toml
ADD ./optuna_dashboard /usr/src/optuna_dashboard
COPY --from=front-builder /usr/src/optuna_dashboard/optuna_dashboard/public/ /usr/src/optuna_dashboard/public/
RUN pip install --progress-bar off .

FROM python:3.12-slim-bookworm AS runner

COPY --from=python-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=python-builder /usr/local/bin/optuna-dashboard /usr/local/bin/optuna-dashboard

RUN mkdir /app
WORKDIR /app

EXPOSE 8080
ENTRYPOINT ["optuna-dashboard", "--port", "8080", "--host", "0.0.0.0", "--server", "gunicorn"]
