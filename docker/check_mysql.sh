#!/bin/sh

DIR=$(cd $(dirname $0); pwd)
OPTUNA_DASHBOARD_IMAGE=${OPTUNA_DASHBOARD_IMAGE:-optuna-dashboard}

echo ""
echo "1. Prepare MYSQL 8.0 Server using Docker."
echo ""

set -e
docker run \
  -d \
  --rm \
  -p 3306:3306 \
  -e MYSQL_USER=optuna \
  -e MYSQL_DATABASE=optuna \
  -e MYSQL_PASSWORD=password \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
  --name optuna-mysql \
  mysql:8

echo "Wait ready for MySQL"
sleep 20


echo ""
echo "2. Run an Optuna example."
echo ""

python ${DIR}/optuna_example.py "mysql+pymysql://optuna:password@127.0.0.1:3306/optuna"

set +e

echo ""
echo "3. Open Web Dashboard"
echo ""

docker run -it --rm -p 8080:8080 --link=optuna-mysql $OPTUNA_DASHBOARD_IMAGE "mysql+pymysql://optuna:password@optuna-mysql:3306/optuna"

echo ""
echo "4. Stop MYSQL Server"
echo ""

docker stop optuna-mysql
