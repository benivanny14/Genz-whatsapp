#!/usr/bin/env bash
# =============================================================================
# check-production-health.sh — monitor GENZ Messenger production health and
# alert when the backend goes down.
#
# Checks the Render-hosted API's liveness + readiness endpoints and alerts
# when the service is unreachable or not ready. Handles Render free-tier cold
# starts (a sleeping instance can take ~60s to wake) with retry/backoff so a
# cold start is NOT reported as an outage.
#
# Usage:
#   ./scripts/check-production-health.sh            # one-shot (cron friendly)
#   ./scripts/check-production-health.sh --watch    # loop forever, interval env
#
# Env vars (all optional):
#   PROD_URL           Base URL to probe  (default https://genz-whatsapp-1.onrender.com)
#   CHECK_INTERVAL     Seconds between checks in --watch mode (default 60)
#   RETRIES            Cold-start retries before declaring down (default 6)
#   RETRY_DELAY        Seconds between retries (default 10)
#   ALERT_WEBHOOK_URL  Generic webhook (ntfy / Slack / Telegram bot) — POSTed
#                      a JSON body { text: "...", severity: "down"|"recovered" }
#   ALERT_LOG          File to append alert lines to (default .health-alerts.log)
#   QUIET=1            No stdout (log + alert only) — for silent cron runs
#
# Exit codes:
#   0  healthy (or recovered)
#   1  service DOWN after retries
#   2  usage/script error
# =============================================================================
set -uo pipefail

PROD_URL="${PROD_URL:-https://genz-whatsapp-1.onrender.com}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
RETRIES="${RETRIES:-6}"
RETRY_DELAY="${RETRY_DELAY:-10}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_LOG="${ALERT_LOG:-.health-alerts.log}"
QUIET="${QUIET:-0}"

say() { [ "$QUIET" != "1" ] && printf '%s\n' "$*"; }
log_alert() { printf '%s %s\n' "$(date -Is 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)" "$1" >> "$ALERT_LOG"; }

STATE_FILE="${TMPDIR:-/tmp}/genz-prod-health-state"
last_state="$(cat "$STATE_FILE" 2>/dev/null || echo unknown)"

# Send an alert to the optional webhook + local log. Re-alerts are deduped:
# only alert on state CHANGES (up->down, down->up), so the log records real
# transitions, not every poll.
alert() {
  local message="$1" state="$2"
  if [ "$last_state" = "$state" ]; then
    say "[health] (state unchanged — no duplicate alert) $message"
    return
  fi
  log_alert "$message"
  say "[health] ⚠ $message"
  if [ -n "$ALERT_WEBHOOK_URL" ]; then
    curl -s -m 15 -X POST "$ALERT_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"$message\",\"severity\":\"$state\",\"time\":\"$(date -Is 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)\"}" \
      >/dev/null 2>&1 || say "[health] (webhook POST failed)"
  fi
}

# Probe both endpoints. ready=0 means the API answered 200 with an OK status.
probe() {
  local base="$1"
  local live_code ready_code live_status ready_status

  live_code="$(curl -s -m 15 -o /tmp/genz-live.json -w '%{http_code}' "$base/api/health/live" 2>/dev/null)"
  ready_code="$(curl -s -m 20 -o /tmp/genz-ready.json -w '%{http_code}' "$base/api/health/ready" 2>/dev/null)"
  live_status="$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /tmp/genz-live.json 2>/dev/null | head -1)"
  ready_status="$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' /tmp/genz-ready.json 2>/dev/null | head -1)"

  if [ "$live_code" = "200" ] && { [ "$ready_code" = "200" ] || [ "$ready_code" = "503" ]; }; then
    # live answers; ready=503 means Mongo disconnected — report degraded, not down
    if [ "$ready_code" = "503" ]; then
      return 2
    fi
    return 0
  fi
  if [ "$live_code" = "000" ] || [ "$live_code" = "" ]; then
    return 1   # unreachable
  fi
  return 1
}

check_once() {
  local rc
  probe "$PROD_URL"
  rc=$?
  if [ "$rc" = "0" ]; then
    say "[health] ✅ $PROD_URL up (live + ready)"
    if [ "$last_state" = "down" ]; then
      echo "up" > "$STATE_FILE"
      alert "RECOVERED: $PROD_URL is back online" "recovered"
    fi
    echo "up" > "$STATE_FILE"
    return 0
  elif [ "$rc" = "2" ]; then
    say "[health] ⚠️ $PROD_URL up but NOT READY (Mongo disconnected?)"
    if [ "$last_state" != "degraded" ]; then
      echo "degraded" > "$STATE_FILE"
      alert "DEGRADED: $PROD_URL answers but Mongo is disconnected (/api/health/ready → 503)" "degraded"
    fi
    return 0
  fi

  # Down — retry with backoff (covers Render cold starts)
  say "[health] ❌ $PROD_URL unreachable — retrying $RETRIES times every ${RETRY_DELAY}s (cold start?)"
  local i
  for i in $(seq 1 "$RETRIES"); do
    sleep "$RETRY_DELAY"
    probe "$PROD_URL"; rc=$?
    if [ "$rc" = "0" ]; then
      say "[health] ✅ recovered after $i retries (was a cold start)"
      if [ "$last_state" = "down" ]; then
        echo "up" > "$STATE_FILE"
        alert "RECOVERED: $PROD_URL is back online after $i retries" "recovered"
      fi
      echo "up" > "$STATE_FILE"
      return 0
    fi
    say "[health]   retry $i/$RETRIES still unreachable"
  done

  echo "down" > "$STATE_FILE"
  alert "DOWN: $PROD_URL unreachable — users cannot reach the API. Check https://dashboard.render.com → service logs (crash loop? memory? free-tier sleep?)" "down"
  return 1
}

main() {
  case "${1:-}" in
    --watch)
      say "[health] watching $PROD_URL every ${CHECK_INTERVAL}s (Ctrl-C to stop)"
      while true; do check_once; sleep "$CHECK_INTERVAL"; done
      ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    "")
      check_once
      exit $?
      ;;
    *)
      echo "Usage: $0 [--watch]" >&2
      exit 2
      ;;
  esac
}

main "$@"