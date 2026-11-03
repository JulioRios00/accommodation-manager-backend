#!/bin/bash
# Run once on a fresh Ubuntu 22.04 EC2 instance as the ubuntu user.
# Usage: bash bootstrap.sh
set -e

# Repo root and the Nest app inside it. The app moved into backend/ when the repository was
# restructured; everything below addresses the two separately rather than assuming they are
# the same directory.
REPO="${REPO:-/home/ubuntu/app}"
APP="$REPO/backend"

echo "==> Updating system packages"
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Installing Node.js 20 LTS"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing PM2 globally"
sudo npm install -g pm2

echo "==> Installing Nginx"
sudo apt-get install -y nginx

echo "==> Installing Git"
sudo apt-get install -y git

# The repo may already be here — the migration runbook clones it before calling this, so
# that the script being run is the one from the branch being deployed.
if [ ! -d "$REPO/.git" ]; then
  echo "==> Cloning backend repo"
  echo ">>> Clone your own fork/organisation copy instead if this is not it:"
  echo ">>>   git clone <url> $REPO"
  git clone https://github.com/JulioRios00/accommodation-manager-backend.git "$REPO"
fi

echo "==> Installing dependencies and building"
# The Nest app lives in backend/, not at the repo root.
cd "$APP"
npm ci --omit=dev
npm run build

echo "==> Copying Nginx config"
sudo cp "$APP/ec2/nginx.conf" /etc/nginx/sites-available/accommodation-manager
sudo ln -sf /etc/nginx/sites-available/accommodation-manager /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> Setting up memory monitor (cron + logrotate)"
chmod +x "$APP/ec2/memory-monitor.sh" "$APP/ec2/memory-report.sh"
mkdir -p "$REPO/logs" /home/ubuntu/logs
sudo cp "$APP/ec2/memory-monitor-logrotate.conf" /etc/logrotate.d/memory-monitor
(crontab -l 2>/dev/null | grep -v memory-monitor.sh; echo "*/5 * * * * $APP/ec2/memory-monitor.sh >> $REPO/logs/memory-monitor-cron.log 2>&1") | crontab -
echo ">>> Memory monitor installed: runs every 5 min, logs to $REPO/logs/memory-monitor.log"
echo ">>> Sends a Sentry alert automatically once SENTRY_DSN is set in .env (below) and usage crosses 85%"
echo ">>> Run $APP/ec2/memory-report.sh anytime for a usage trend summary"

echo "==> Setting up environment file"
# dotenv/config reads .env from the working directory, and PM2 starts the app from backend/,
# so the file belongs there — not at the repo root.
if [ -f "$APP/.env" ]; then
  echo ">>> $APP/.env already exists — leaving it alone"
else
  cp "$APP/.env.example" "$APP/.env"
  echo ">>> IMPORTANT: fill in $APP/.env before starting PM2"
fi

echo "==> Not starting the app: it has no configuration yet"

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. nano $APP/.env                   (fill in all secrets)"
echo "  2. cd $APP"
echo "  3. pm2 start ec2/ecosystem.config.js   (carries NODE_ENV, PORT, log paths)"
echo "  4. pm2 save"
echo "  5. sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu"
echo ""
echo "  Then check it is serving AND reaching the database:"
echo "    curl -s -o /dev/null -w '%{http_code}\\n' http://localhost:3001/api/health"
echo "    200 = up and connected, 503 = up but no database, refused = not running"
