FROM node:20 AS front-builder

WORKDIR /usr/src/tslib/storage
ADD ./tslib/storage/package.json /usr/src/tslib/storage/package.json
ADD ./tslib/storage/package-lock.json /usr/src/tslib/storage/package-lock.json
RUN npm install

WORKDIR /usr/src/tslib/types
ADD ./tslib/types/package.json /usr/src/tslib/types/package.json
ADD ./tslib/types/package-lock.json /usr/src/tslib/types/package-lock.json
RUN npm install

WORKDIR /usr/src/tslib/react
ADD ./tslib/react/package.json /usr/src/tslib/react/package.json
ADD ./tslib/react/package-lock.json /usr/src/tslib/react/package-lock.json
RUN npm install

WORKDIR /usr/src/optuna_dashboard
ADD ./optuna_dashboard/package.json /usr/src/optuna_dashboard/package.json
ADD ./optuna_dashboard/package-lock.json /usr/src/optuna_dashboard/package-lock.json
RUN npm install

WORKDIR /usr/src/
ADD ./tslib /usr/src/tslib
RUN make tslib

WORKDIR /usr/src/optuna_dashboard
ADD ./optuna_dashboard /usr/src/optuna_dashboard
RUN npm install
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build:prd

FROM python:3.12-bookworm AS python-builder

WORKDIR /usr/src
RUN pip install --upgrade pip setuptools
RUN pip install --progress-bar off PyMySQL[rsa] psycopg2-binary gunicorn

ADD ./pyproject.toml /usr/src/pyproject.toml
ADD ./optuna_dashboard /usr/src/optuna_dashboard
COPY --from=front-builder /usr/src/optuna_dashboard/public/ /usr/src/optuna_dashboard/public/
RUN pip install --progress-bar off .

FROM python:3.12-slim-bookworm as runner

COPY --from=python-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=python-builder /usr/local/bin/optuna-dashboard /usr/local/bin/optuna-dashboard

RUN mkdir /app
WORKDIR /app

EXPOSE 8080
ENTRYPOINT ["optuna-dashboard", "--port", "8080", "--host", "0.0.0.0", "--server", "gunicorn"]
