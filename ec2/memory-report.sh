#!/bin/bash
# Summarizes memory-monitor.log to help decide if the instance needs upsizing.
# Usage: ./memory-report.sh [days]   (default: 7)

set -euo pipefail

LOG_FILE="/home/ubuntu/app/logs/memory-monitor.log"
DAYS="${1:-7}"
SINCE=$(date -u -d "-${DAYS} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-"${DAYS}"d +"%Y-%m-%dT%H:%M:%SZ")

if [ ! -f "$LOG_FILE" ]; then
  echo "No log file found at $LOG_FILE yet."
  exit 0
fi

echo "== Memory report: last ${DAYS} day(s) (since $SINCE) =="
echo

awk -v since="$SINCE" '
  {
    ts = $1; gsub(/^\[|\]$/, "", ts);
    if (ts < since) next;
    for (i=1; i<=NF; i++) {
      if ($i ~ /^used_percent=/) {
        split($i, a, "="); gsub("%", "", a[2]);
        pct = a[2] + 0;
        sum += pct; n++;
        if (pct > max) { max = pct; max_ts = ts }
        if (min == "" || pct < min) { min = pct; min_ts = ts }
      }
      if ($i ~ /^level=CRITICAL/) crit++
    }
  }
  END {
    if (n == 0) { print "No samples in this window."; exit }
    printf "Samples:            %d\n", n
    printf "Average used:       %.1f%%\n", sum/n
    printf "Peak used:          %.1f%% (at %s)\n", max, max_ts
    printf "Lowest used:        %.1f%% (at %s)\n", min, min_ts
    printf "CRITICAL alerts:    %d\n", crit+0
  }
' "$LOG_FILE"

echo
echo "Rule of thumb:"
echo "  - Average used > 70-75% sustained -> plan an upgrade soon."
echo "  - Peak repeatedly hitting 90%+ or frequent CRITICAL alerts -> upgrade now."
echo "  - Swap usage consistently > 0 -> instance is already out of headroom."
echo
echo "Swap usage samples (non-zero only):"
grep -o 'swap_used=[0-9]*MB' "$LOG_FILE" | grep -v 'swap_used=0MB' | tail -20 || echo "  none found"
