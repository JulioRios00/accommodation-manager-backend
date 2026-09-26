#!/bin/bash
# Polls system memory every run, logs a clear line for trend/capacity analysis,
# and reports a Sentry event when usage crosses CRITICAL_THRESHOLD.
# Meant to run from cron every few minutes on the EC2 instance.
#
# Setup (once):
#   chmod +x /home/ubuntu/app/ec2/memory-monitor.sh
#   crontab -e
#   */5 * * * * /home/ubuntu/app/ec2/memory-monitor.sh >> /home/ubuntu/app/logs/memory-monitor-cron.log 2>&1
#
# Reads SENTRY_DSN from /home/ubuntu/app/.env (same DSN the NestJS app uses).

set -euo pipefail
export LC_ALL=C

APP_DIR="/home/ubuntu/app"
ENV_FILE="$APP_DIR/.env"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/memory-monitor.log"
STATE_FILE="$LOG_DIR/.memory-monitor-last-alert"

CRITICAL_THRESHOLD=85          # percent used memory that triggers an alert
ALERT_COOLDOWN_SECONDS=1800    # don't re-alert more than once per 30 min

mkdir -p "$LOG_DIR"

# ---- Load SENTRY_DSN from the app's .env without executing the file ----
SENTRY_DSN=""
if [ -f "$ENV_FILE" ]; then
  SENTRY_DSN=$(grep -E '^SENTRY_DSN=' "$ENV_FILE" | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ---- Memory stats (MB) from `free` ----
read -r TOTAL_MB USED_MB FREE_MB SHARED_MB BUFFCACHE_MB AVAILABLE_MB <<EOF
$(free -m | awk '/^Mem:/ {print $2, $3, $4, $5, $6, $7}')
EOF

read -r SWAP_TOTAL_MB SWAP_USED_MB <<EOF
$(free -m | awk '/^Swap:/ {print $2, $3}')
EOF

# "Available" (kernel estimate of usable memory) is the accurate gauge,
# not raw "used", since Linux uses free RAM for disk cache.
USED_PERCENT=$(awk -v total="$TOTAL_MB" -v avail="$AVAILABLE_MB" \
  'BEGIN { printf "%.1f", ((total - avail) / total) * 100 }')

# ---- Top 5 memory-consuming processes ----
TOP_PROCESSES=$(ps -eo pid,comm,%mem,rss --sort=-%mem | head -6 | tail -5 | \
  awk '{printf "%s(pid=%s,%.1f%%,%.0fMB) ", $2, $1, $3, $4/1024}')

# ---- Instance type (best-effort, IMDSv2) ----
INSTANCE_TYPE="unknown"
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" --max-time 2 || true)
if [ -n "$TOKEN" ]; then
  INSTANCE_TYPE=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/instance-type" --max-time 2 || echo "unknown")
fi

# ---- Always log a clear structured line (this is your capacity-planning trail) ----
LEVEL="OK"
if awk -v p="$USED_PERCENT" -v t="$CRITICAL_THRESHOLD" 'BEGIN{exit !(p>=t)}'; then
  LEVEL="CRITICAL"
fi

echo "[$TIMESTAMP] level=$LEVEL instance_type=$INSTANCE_TYPE total=${TOTAL_MB}MB used=${USED_MB}MB available=${AVAILABLE_MB}MB used_percent=${USED_PERCENT}% swap_total=${SWAP_TOTAL_MB}MB swap_used=${SWAP_USED_MB}MB top_processes=\"$TOP_PROCESSES\"" \
  >> "$LOG_FILE"

# ---- Alert via Sentry if critical (with cooldown to avoid spam) ----
if [ "$LEVEL" = "CRITICAL" ]; then
  NOW_EPOCH=$(date +%s)
  LAST_ALERT_EPOCH=0
  [ -f "$STATE_FILE" ] && LAST_ALERT_EPOCH=$(cat "$STATE_FILE")
  SECONDS_SINCE_LAST=$((NOW_EPOCH - LAST_ALERT_EPOCH))

  if [ "$SECONDS_SINCE_LAST" -ge "$ALERT_COOLDOWN_SECONDS" ]; then
    if [ -n "$SENTRY_DSN" ]; then
      # Parse DSN: https://PUBLIC_KEY@HOST/PROJECT_ID
      DSN_NO_SCHEME="${SENTRY_DSN#https://}"
      PUBLIC_KEY="${DSN_NO_SCHEME%%@*}"
      HOST_AND_PROJECT="${DSN_NO_SCHEME#*@}"
      SENTRY_HOST="${HOST_AND_PROJECT%%/*}"
      PROJECT_ID="${HOST_AND_PROJECT##*/}"

      EVENT_ID=$(cat /proc/sys/kernel/random/uuid | tr -d '-')
      MESSAGE="EC2 memory usage critical: ${USED_PERCENT}% used (threshold ${CRITICAL_THRESHOLD}%) on ${INSTANCE_TYPE}"

      PAYLOAD=$(cat <<JSON
{
  "event_id": "$EVENT_ID",
  "timestamp": "$TIMESTAMP",
  "platform": "other",
  "level": "error",
  "logger": "ec2.memory-monitor",
  "message": "$MESSAGE",
  "tags": {
    "instance_type": "$INSTANCE_TYPE",
    "used_percent": "$USED_PERCENT"
  },
  "extra": {
    "total_mb": $TOTAL_MB,
    "used_mb": $USED_MB,
    "available_mb": $AVAILABLE_MB,
    "swap_total_mb": $SWAP_TOTAL_MB,
    "swap_used_mb": $SWAP_USED_MB,
    "top_processes": "$TOP_PROCESSES"
  }
}
JSON
)

      curl -s -X POST "https://${SENTRY_HOST}/api/${PROJECT_ID}/store/" \
        -H "Content-Type: application/json" \
        -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=${PUBLIC_KEY}, sentry_client=ec2-memory-monitor/1.0" \
        -d "$PAYLOAD" --max-time 5 >> "$LOG_FILE" 2>&1 || true

      echo "[$TIMESTAMP] level=ALERT_SENT message=\"Sentry event dispatched for high memory usage\"" >> "$LOG_FILE"
    else
      echo "[$TIMESTAMP] level=ALERT_SKIPPED message=\"SENTRY_DSN not set in $ENV_FILE\"" >> "$LOG_FILE"
    fi
    echo "$NOW_EPOCH" > "$STATE_FILE"
  fi
fi
