#!/bin/bash
# One-time server setup for ZiyaNisa on Hetzner (Ubuntu 22.04)
# Run as root: bash setup.sh
# Idempotent — safe to re-run.

set -euo pipefail

DOMAIN="ziyanisa.bilionsales.com"
APP_DIR="/opt/ziyanisa"
APP_USER="www-data"
REPO_URL="https://github.com/alitheone007/ZiyaNisa.git"

echo "=== [1/8] System packages ==="
apt-get update -qq
apt-get install -y -qq \
    git curl rsync nginx certbot python3-certbot-nginx \
    python3 python3-venv python3-pip \
    build-essential libssl-dev

echo "=== [2/8] MongoDB ==="
if ! command -v mongod &>/dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
        | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
        https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
        > /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org
fi
systemctl enable --now mongod

echo "=== [3/8] Clone / pull repo ==="
if [ ! -d "$APP_DIR/.git" ]; then
    git clone "$REPO_URL" "$APP_DIR"
else
    cd "$APP_DIR" && git fetch origin main && git reset --hard origin/main
fi
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "=== [4/8] Python venv + dependencies ==="
if [ ! -d "$APP_DIR/venv" ]; then
    python3 -m venv "$APP_DIR/venv"
fi
source "$APP_DIR/venv/bin/activate"
pip install -q --upgrade pip
pip install -q -r "$APP_DIR/backend/requirements.txt"

echo "=== [5/8] Production .env ==="
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/deploy/.env.production" "$APP_DIR/backend/.env"
    echo ""
    echo "  !! ACTION REQUIRED: edit $APP_DIR/backend/.env with real values !!"
    echo ""
fi
chmod 600 "$APP_DIR/backend/.env"
chown "$APP_USER":"$APP_USER" "$APP_DIR/backend/.env"

echo "=== [6/8] systemd service ==="
cp "$APP_DIR/deploy/ziyanisa-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable ziyanisa-backend
systemctl restart ziyanisa-backend

echo "=== [7/8] Nginx ==="
mkdir -p "$APP_DIR/frontend/build"
cp "$APP_DIR/deploy/nginx-ziyanisa.conf" /etc/nginx/sites-available/ziyanisa
ln -sf /etc/nginx/sites-available/ziyanisa /etc/nginx/sites-enabled/ziyanisa
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== [8/8] SSL certificate (Let's Encrypt) ==="
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@bilionsales.com
else
    echo "Certificate already exists, skipping."
fi

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Edit $APP_DIR/backend/.env with real ADMIN_PHONE, SECRET_KEY, etc."
echo "  2. systemctl restart ziyanisa-backend"
echo "  3. Set GitHub Actions secrets: HETZNER_HOST, HETZNER_USER, HETZNER_SSH_KEY"
echo "  4. Copy your UPI QR: scp upi-qr.jpg root@$DOMAIN:$APP_DIR/frontend/build/"
echo "  5. Push to main → CI/CD will take over from here"
