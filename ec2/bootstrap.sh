#!/bin/bash
# Run once on a fresh Ubuntu 22.04 EC2 instance as the ubuntu user.
# Usage: bash bootstrap.sh
set -e

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

echo "==> Cloning backend repo"
git clone https://github.com/JulioRios00/accommodation-manager-backend.git /home/ubuntu/app
cd /home/ubuntu/app

echo "==> Installing dependencies and building"
npm install
npm run build

echo "==> Copying PM2 ecosystem config"
cp ec2/ecosystem.config.js /home/ubuntu/app/ecosystem.config.js

echo "==> Copying Nginx config"
sudo cp ec2/nginx.conf /etc/nginx/sites-available/accommodation-manager
sudo ln -sf /etc/nginx/sites-available/accommodation-manager /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "==> Setting up environment file"
echo ">>> IMPORTANT: Edit /home/ubuntu/app/.env before starting PM2"
echo ">>> Copy the contents from .env.example and fill in real values"
cp /home/ubuntu/app/.env.example /home/ubuntu/app/.env

echo "==> Starting app with PM2"
echo ">>> Run: nano /home/ubuntu/app/.env  — fill in all values first"
echo ">>> Then: cd /home/ubuntu/app && pm2 start ecosystem.config.js"
echo ">>> Then: pm2 save && pm2 startup  — to auto-restart on reboot"

echo ""
echo "Bootstrap complete. Next steps:"
echo "  1. nano /home/ubuntu/app/.env       (fill in all secrets)"
echo "  2. cd /home/ubuntu/app"
echo "  3. pm2 start ecosystem.config.js"
echo "  4. pm2 save"
echo "  5. sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu"
