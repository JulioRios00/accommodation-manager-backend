#!/bin/bash
# Run from /home/ubuntu/app to pull latest code and restart.
# Usage: bash ec2/deploy.sh
set -e

echo "==> Pulling latest code"
git pull origin main

echo "==> Installing dependencies"
npm install --omit=dev

echo "==> Building"
npm run build

echo "==> Restarting PM2"
pm2 restart accommodation-manager

echo "==> Done. Current status:"
pm2 status
