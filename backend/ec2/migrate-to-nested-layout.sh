#!/bin/bash
#
# One-time migration of the EC2 box from the old flat layout to the current one.
#
# Why this is needed
#   The box checked out a repository whose ROOT was the Nest app (src/, dist/,
#   package.json at the top). main's history was later replaced and the app moved
#   into a backend/ subdirectory. The two histories share no common ancestor, so a
#   plain `git reset --hard origin/main` in place would move every app file out from
#   under the running PM2 process and delete the root .env (the new root .gitignore
#   does not cover it). This script does the move in a copy, proves the new build
#   boots, and only then switches over.
#
# Usage, from anywhere on the box:
#   bash /home/ubuntu/app/ec2/migrate-to-nested-layout.sh
#
# Rollback at any point before the final step: nothing has changed.
# Rollback after it: see the instructions printed at the end.

set -euo pipefail

BASE="${BASE:-/home/ubuntu}"
LIVE="$BASE/app"              # current app directory, old layout
STAGE="$BASE/app-migrating"   # scratch copy, becomes the new app directory
OLD="$BASE/app-preMigration"  # the old directory, kept for rollback
PM2_APP="${PM2_APP:-backend}"
SMOKE_PORT="${SMOKE_PORT:-3099}"

say() { echo; echo "==> $*"; }

# ---------------------------------------------------------------- preconditions
say "Checking preconditions"
[ -d "$LIVE/.git" ]      || { echo "No git checkout at $LIVE" >&2; exit 1; }
[ -f "$LIVE/.env" ]      || { echo "No .env at $LIVE — refusing to continue" >&2; exit 1; }
[ -d "$OLD" ]            && { echo "$OLD already exists; a migration has run before." >&2
                              echo "Move it aside before re-running." >&2; exit 1; }
command -v pm2 >/dev/null || { echo "pm2 not on PATH" >&2; exit 1; }
pm2 describe "$PM2_APP" >/dev/null 2>&1 || {
  echo "No PM2 process named '$PM2_APP'. Running:" >&2; pm2 status >&2; exit 1; }

# ------------------------------------------------------------------ 1. back up
say "Backing up .env"
BACKUP="$BASE/env-backup-$(date +%Y%m%d-%H%M%S)"
cp "$LIVE/.env" "$BACKUP"
echo "    saved to $BACKUP"

# -------------------------------------------------------- 2. stage a copy
say "Copying $LIVE -> $STAGE (this keeps the live directory untouched)"
rm -rf "$STAGE"
cp -a "$LIVE" "$STAGE"

say "Moving the staged copy to the current layout"
cd "$STAGE"
git fetch origin main
# Unrelated histories: reset accepts this, it simply replaces the tree.
git reset --hard origin/main
# Old root files (src/, dist/, ec2/, package.json...) are untracked now. The root
# .gitignore in the new layout does NOT cover .env, so clean would delete it —
# which is exactly why it was backed up above.
git clean -fd

[ -f "$STAGE/backend/package.json" ] || {
  echo "Expected $STAGE/backend/package.json after the reset — layout is not what" >&2
  echo "this script assumes. Nothing live has changed; $STAGE can be deleted." >&2
  exit 1; }

say "Restoring .env into the app directory"
# dotenv/config reads .env from the process working directory, which is now backend/.
cp "$BACKUP" "$STAGE/backend/.env"

# ------------------------------------------------------------------ 3. build
say "Installing and building"
cd "$STAGE/backend"
npm ci --omit=dev --no-audit --no-fund --maxsockets=3
npm run build
[ -f "$STAGE/backend/dist/main.js" ] || { echo "Build produced no dist/main.js" >&2; exit 1; }

# -------------------------------------------------------------- 4. smoke test
say "Smoke testing the new build on port $SMOKE_PORT (not touching the live app)"
set +e
PORT="$SMOKE_PORT" node dist/main.js > /tmp/migrate-smoke.log 2>&1 &
SMOKE_PID=$!
for _ in $(seq 1 45); do
  grep -q "Nest application successfully started" /tmp/migrate-smoke.log && break
  kill -0 "$SMOKE_PID" 2>/dev/null || break
  sleep 1
done
grep -q "Nest application successfully started" /tmp/migrate-smoke.log
SMOKE_OK=$?
kill "$SMOKE_PID" 2>/dev/null; wait "$SMOKE_PID" 2>/dev/null
set -e
if [ "$SMOKE_OK" -ne 0 ]; then
  echo "The new build did not start. Last lines of /tmp/migrate-smoke.log:" >&2
  tail -20 /tmp/migrate-smoke.log >&2
  echo "Nothing live has changed. Fix, then re-run." >&2
  exit 1
fi
echo "    new build starts cleanly"

# ----------------------------------------------------------------- 5. switch
say "Switching over (brief downtime starts here)"
pm2 stop "$PM2_APP"
mv "$LIVE" "$OLD"
mv "$STAGE" "$LIVE"

pm2 delete "$PM2_APP"
cd "$LIVE/backend"
# Started from backend/, so PM2 records that as cwd and dotenv finds .env there.
pm2 start dist/main.js --name "$PM2_APP" --update-env
pm2 save

say "Done"
pm2 status
cat <<EOF

The old directory is kept at $OLD and .env at $BACKUP.

Check the app is actually serving before you walk away:
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/health
/api/health is @Public() and also pings the database, so 200 means the app is up
AND connected to Postgres. 503 means it started but cannot reach the database
(check .env landed correctly). Connection refused means it is not running.

To roll back:
  pm2 delete $PM2_APP
  mv $LIVE $BASE/app-failed && mv $OLD $LIVE
  cd $LIVE && pm2 start dist/main.js --name $PM2_APP && pm2 save

Once you are happy, set the deploy workflow going: run it from the Actions tab
with allow_unrelated_history ticked for the first run only. After this migration
the box shares history with main, so later pushes deploy normally.
EOF
