FROM node:20 AS front-builder
WORKDIR /usr/src

ADD ./optuna_dashboard_client/ /usr/src/optuna_dashboard_client/
RUN mkdir -p /usr/src/optuna_dashboard/public
RUN cd optuna_dashboard_client/ && npm install && npm run build:prd

FROM python:3.11-buster AS python-builder

WORKDIR /usr/src
RUN pip install --upgrade pip setuptools
RUN pip install --progress-bar off PyMySQL[rsa] psycopg2-binary gunicorn optuna-fast-fanova

ADD ./pyproject.toml /usr/src/pyproject.toml
ADD ./optuna_dashboard /usr/src/optuna_dashboard
COPY --from=front-builder /usr/src/optuna_dashboard/public/ /usr/src/optuna_dashboard/public/
RUN pip install --progress-bar off .

FROM python:3.11-slim-buster as runner

COPY --from=python-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-builder /usr/local/bin/optuna-dashboard /usr/local/bin/optuna-dashboard

RUN mkdir /app
WORKDIR /app

EXPOSE 8080
ENTRYPOINT ["optuna-dashboard", "--port", "8080", "--host", "0.0.0.0", "--server", "gunicorn"]
