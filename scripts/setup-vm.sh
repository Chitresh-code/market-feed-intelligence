#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
NGINX_CONF_SOURCE="$DEPLOY_DIR/nginx/market-feed.conf"
API_SERVICE_SOURCE="$DEPLOY_DIR/systemd/market-feed-api.service"
WEB_SERVICE_SOURCE="$DEPLOY_DIR/systemd/market-feed-web.service"

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to set up nginx and systemd." >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is required but not installed." >&2
  exit 1
fi

echo "Installing nginx site config..."
sudo cp "$NGINX_CONF_SOURCE" /etc/nginx/sites-available/market-feed
sudo ln -sf /etc/nginx/sites-available/market-feed /etc/nginx/sites-enabled/market-feed
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Installing systemd service units..."
sudo cp "$API_SERVICE_SOURCE" /etc/systemd/system/market-feed-api.service
sudo cp "$WEB_SERVICE_SOURCE" /etc/systemd/system/market-feed-web.service
sudo systemctl daemon-reload
sudo systemctl enable market-feed-api.service
sudo systemctl enable market-feed-web.service

echo "VM setup complete."
echo "Start services with:"
echo "  sudo systemctl start market-feed-api.service"
echo "  sudo systemctl start market-feed-web.service"
