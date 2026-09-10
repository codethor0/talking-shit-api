#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 https://talking-shit-api.<subdomain>.workers.dev" >&2
  exit 2
fi

BASE_URL="${BASE_URL%/}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

expect_status() {
  local label="$1"
  local expected="$2"
  shift 2

  local code
  if ! code="$(
    curl -q --silent --show-error --max-time 10 \
      --output "$TMP/body" \
      --dump-header "$TMP/headers" \
      --write-out '%{http_code}' \
      "$@"
  )"; then
    echo "SMOKE: FAIL - $label transport error" >&2
    return 1
  fi

  if [[ "$code" != "$expected" ]]; then
    echo "SMOKE: FAIL - $label expected $expected got $code" >&2
    cat "$TMP/body" >&2
    return 1
  fi

  printf 'PASS %-28s HTTP %s\n' "$label" "$code"
}

expect_json() {
  local label="$1"
  local path="$2"
  expect_status "$label" 200 -H 'Accept: application/json' "$BASE_URL$path"
  grep -Fq '"ok":true' "$TMP/body" || {
    echo "SMOKE: FAIL - $label did not return success JSON" >&2
    return 1
  }
}

echo "===== ROUTES ====="
expect_json "root" "/"
expect_json "health" "/v1/health"
expect_json "categories" "/v1/categories"
expect_json "security dark roast" "/v1/roast?category=security&level=dark"
expect_json "bounded batch" "/v1/batch?count=3&category=git&level=dark"
expect_json "surprise roast" "/v1/surprise"
expect_json "catalog stats" "/v1/stats"
expect_status "openapi" 200 -H 'Accept: application/json' "$BASE_URL/openapi.json"
grep -Fq '"openapi":"3.1.0"' "$TMP/body" || {
  echo "SMOKE: FAIL - OpenAPI version missing" >&2
  exit 1
}

echo
echo "===== NEGATIVE CONTRACT ====="
expect_status "unknown route" 404 "$BASE_URL/not-a-route"
expect_status "invalid query" 400 "$BASE_URL/v1/roast?wat=nope"
expect_status "batch count rejected" 400 "$BASE_URL/v1/batch?count=6"
expect_status "surprise query rejected" 400 "$BASE_URL/v1/surprise?category=code"
expect_status "stats query rejected" 400 "$BASE_URL/v1/stats?detail=all"
expect_status "POST rejected" 405 -X POST "$BASE_URL/v1/roast"
expect_status "unknown OPTIONS" 404 -X OPTIONS "$BASE_URL/not-a-route"

echo
echo "===== METHODS ====="
expect_status "HEAD health" 200 --head "$BASE_URL/v1/health"
expect_status "OPTIONS health" 204 -X OPTIONS "$BASE_URL/v1/health"

if [[ -s "$TMP/body" ]]; then
  echo "SMOKE: FAIL - OPTIONS response body must be empty" >&2
  exit 1
fi

for header in \
  'Access-Control-Allow-Origin: *' \
  'Access-Control-Max-Age: 86400'; do
  if ! tr -d '\r' < "$TMP/headers" | grep -Fqi "$header"; then
    echo "SMOKE: FAIL - missing header: $header" >&2
    exit 1
  fi
done

echo
echo "===== SECURITY HEADERS ====="
expect_status "health headers" 200 "$BASE_URL/v1/health"
for header in \
  'X-Content-Type-Options: nosniff' \
  'Referrer-Policy: no-referrer' \
  'Cache-Control: no-store' \
  'Access-Control-Allow-Origin: *'; do
  if ! tr -d '\r' < "$TMP/headers" | grep -Fqi "$header"; then
    echo "SMOKE: FAIL - missing header: $header" >&2
    exit 1
  fi
done

echo
echo "SMOKE: PASS"
