#!/usr/bin/env bash
# Runs the load test against a local production build and counts how many
# requests reached the upstream APIs.
#
#   pnpm build && pnpm load
#
# Extra arguments go to k6, for example: pnpm load -e PEAK_RATE=100
set -euo pipefail

PORT="${PORT:-3150}"
RESULTS_DIR="load-tests/results"
SERVER_LOG="$RESULTS_DIR/server.log"
mkdir -p "$RESULTS_DIR"

if ! command -v k6 >/dev/null; then
  echo "k6 is not installed. See https://grafana.com/docs/k6/latest/set-up/install-k6/" >&2
  exit 1
fi

# Log every real upstream request (endpoint names only, no URLs).
LOG_UPSTREAM_CALLS=1 pnpm start --port "$PORT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "Waiting for the server on port $PORT..."
until curl -s -o /dev/null "http://localhost:$PORT/"; do sleep 1; done

status=0
k6 run \
  -e BASE_URL="http://localhost:$PORT" \
  --summary-export "$RESULTS_DIR/summary.json" \
  "$@" load-tests/comparison.js || status=$?

echo
echo "Requests that reached the upstream APIs during the whole run:"
total=$(grep -c '"type":"upstream"' "$SERVER_LOG" || true)
echo "  total: $total"
grep '"type":"upstream"' "$SERVER_LOG" \
  | sed -E 's/.*"service":"([^"]+)","endpoint":"([^"]+)".*/\1 \2/' \
  | sort | uniq -c | sort -rn | sed 's/^/  /'

exit "$status"
