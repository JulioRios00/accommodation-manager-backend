#!/bin/bash
# Manual deploy, for when you'd rather not go through GitHub Actions.
# Run from the repo root on the box: bash backend/ec2/deploy.sh
#
# Assumes the box has already been migrated to the nested layout
# (app in backend/) — see migrate-to-nested-layout.sh. Before that migration
# this script's paths are wrong.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$REPO_ROOT/backend"
PM2_APP="${PM2_APP:-backend}"

cd "$REPO_ROOT"

echo "==> Pulling latest code"
git pull origin main

echo "==> Installing dependencies in $APP_DIR"
cd "$APP_DIR"
# @nestjs/cli and typescript are runtime dependencies here, so --omit=dev still builds.
npm ci --omit=dev --no-audit --no-fund

echo "==> Building"
npm run build

echo "==> Reloading PM2 app: $PM2_APP"
pm2 reload "$PM2_APP" --update-env

echo "==> Done. Current status:"
pm2 status
