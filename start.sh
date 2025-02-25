#!/bin/bash

# Parse command line arguments
DAEMON_MODE=false
while getopts "d" opt; do
    case $opt in
        d) DAEMON_MODE=true ;;
        *) ;;
    esac
done
shift $((OPTIND-1))

# Check if database URL is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [-d] <database-url>"
    echo "Options:"
    echo "  -d            Run in daemon mode"
    echo "Example: $0 -d postgresql://postgres:password@localhost:5432/db_name"
    exit 1
fi

DB_URL="$1"

# Obtain the base URL from jupyter server list
BASE_URL=$(jupyter server list --json | grep -o '"base_url": "[^"]*' | grep -o '[^"]*$')
if [ -z "$BASE_URL" ]; then
  echo "Error: BASE_URL is empty. Exiting."
  exit 1
fi

export URL_PREFIX="${BASE_URL}optuna/dashboard"
export API_ENDPOINT="${BASE_URL}optuna/"

if [ "$DAEMON_MODE" = true ]; then
    nohup optuna-dashboard --server auto --port 8081 "$DB_URL" > /tmp/optuna-dashboard.log 2>&1 &
    echo "Optuna Dashboard started in daemon mode. PID: $!"
    echo "Log file: /tmp/optuna-dashboard.log"
else
    optuna-dashboard --server auto --port 8081 "$DB_URL"
fi
