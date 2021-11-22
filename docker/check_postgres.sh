#!/bin/sh

DIR=$(cd $(dirname $0); pwd)
OPTUNA_DASHBOARD_IMAGE=${OPTUNA_DASHBOARD_IMAGE:-optuna-dashboard}

echo ""
echo "1. Run PostgreSQL Server using Docker."
echo ""

set -e
docker run \
  -d \
  --rm \
  -p 5432:5432 \
  -e POSTGRES_USER=optuna \
  -e POSTGRES_DB=optuna \
  -e POSTGRES_PASSWORD=password \
  --name optuna-postgres \
  postgres:10.1-alpine

echo "Wait ready for PostgreSQL"
sleep 20


echo ""
echo "2. Run an Optuna example."
echo ""

python ${DIR}/optuna_example.py "postgresql+psycopg2://optuna:password@127.0.0.1:5432/optuna"

set +e

echo ""
echo "3. Open Web Dashboard"
echo ""

docker run -it --rm -p 8080:8080 --link=optuna-postgres $OPTUNA_DASHBOARD_IMAGE "postgresql+psycopg2://optuna:password@optuna-postgres:5432/optuna"

echo ""
echo "4. Stop MYSQL Server"
echo ""

docker stop optuna-postgres
