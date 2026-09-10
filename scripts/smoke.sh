#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 https://talking-shit-api.<subdomain>.workers.dev" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"

check() {
  local path="$1"
  echo "==> GET $path"
  curl --fail --silent --show-error --max-time 10 \
    -H 'Accept: application/json' \
    "$BASE_URL$path"
  echo
}

check "/v1/health"
check "/v1/categories"
check "/v1/roast?category=security&level=dark"
check "/openapi.json"

echo "SMOKE: PASS"
