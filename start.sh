#!/bin/bash

# Check if an argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <database-url>"
    echo "Example: $0 postgresql://postgres:password@localhost:5432/db_name"
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

optuna-dashboard --server wsgiref --port 8081 "$DB_URL"
