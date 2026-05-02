FROM node:22 AS front-builder

# pnpm prompts "recreate node_modules?" before wiping the dir. Docker build
# has no TTY, so the prompt aborts with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY;
# CI=true tells pnpm to skip the prompt and proceed.
ENV CI=true
RUN corepack enable

WORKDIR /usr/src/tslib/types
ADD ./tslib/types/ /usr/src/tslib/types/
RUN pnpm install --frozen-lockfile && pnpm run build

WORKDIR /usr/src/tslib/storage
ADD ./tslib/storage/ /usr/src/tslib/storage/
RUN pnpm install --frozen-lockfile && pnpm run build

WORKDIR /usr/src/tslib/react
ADD ./tslib/react/ /usr/src/tslib/react/
RUN pnpm install --frozen-lockfile && pnpm run build

WORKDIR /usr/src/optuna_dashboard
ADD ./optuna_dashboard /usr/src/optuna_dashboard
RUN pnpm install --frozen-lockfile
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:prd

FROM python:3.12-bookworm AS python-builder

WORKDIR /usr/src
RUN pip install --upgrade pip setuptools
RUN pip install --progress-bar off PyMySQL[rsa] psycopg2-binary gunicorn

ADD ./pyproject.toml /usr/src/pyproject.toml
ADD ./optuna_dashboard /usr/src/optuna_dashboard
COPY --from=front-builder /usr/src/optuna_dashboard/public/ /usr/src/optuna_dashboard/public/
RUN pip install --progress-bar off .

FROM python:3.12-slim-bookworm AS runner

COPY --from=python-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=python-builder /usr/local/bin/optuna-dashboard /usr/local/bin/optuna-dashboard

RUN mkdir /app
WORKDIR /app

EXPOSE 8080
ENTRYPOINT ["optuna-dashboard", "--port", "8080", "--host", "0.0.0.0", "--server", "gunicorn"]
