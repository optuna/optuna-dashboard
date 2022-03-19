FROM node:16 AS front-builder
WORKDIR /usr/src

ADD ./package.json /usr/src/package.json
ADD ./package-lock.json /usr/src/package-lock.json
RUN npm install

ADD ./tsconfig.json /usr/src/tsconfig.json
ADD ./webpack.config.js /usr/src/webpack.config.js
ADD ./optuna_dashboard/ts/ /usr/src/optuna_dashboard/ts
RUN mkdir -p /usr/src/optuna_dashboard/public
RUN npm run build:prd

FROM python:3.8-buster AS python-builder

WORKDIR /usr/src
RUN pip install --upgrade pip setuptools
RUN pip install --progress-bar off PyMySQL[rsa] psycopg2-binary gunicorn

ADD ./setup.cfg /usr/src/setup.cfg
ADD ./setup.py /usr/src/setup.py
ADD ./optuna_dashboard /usr/src/optuna_dashboard
COPY --from=front-builder /usr/src/optuna_dashboard/public/ /usr/src/optuna_dashboard/public/
RUN pip install --progress-bar off .

FROM python:3.8-slim-buster as runner

COPY --from=python-builder /usr/local/lib/python3.8/site-packages /usr/local/lib/python3.8/site-packages
COPY --from=python-builder /usr/local/bin/optuna-dashboard /usr/local/bin/optuna-dashboard

RUN mkdir /app
WORKDIR /app

EXPOSE 8080
ENTRYPOINT ["optuna-dashboard", "--port", "8080", "--host", "0.0.0.0", "--server", "gunicorn"]

