#!/usr/bin/env bash
# =============================================================
# ssl-setup.sh — Add free Let's Encrypt SSL to your VPS
#
# Usage: bash ssl-setup.sh your-domain.com
#
# Prerequisites:
#   - Domain DNS already pointing to this VPS IP
#   - Port 80 open in GCP firewall (deploy.sh already shows how)
# =============================================================
set -euo pipefail

DOMAIN="${1:-}"
[[ -z "$DOMAIN" ]] && { echo "Usage: bash ssl-setup.sh your-domain.com"; exit 1; }

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$REPO_DIR/nginx/certs"

echo "[INFO] Installing certbot..."
sudo apt-get update -qq
sudo apt-get install -y -qq certbot

echo "[INFO] Stopping nginx temporarily to free port 80..."
docker compose -f "$REPO_DIR/docker-compose.yml" stop nginx

echo "[INFO] Obtaining certificate for $DOMAIN..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    -d "$DOMAIN"

echo "[INFO] Copying certs into nginx/certs/..."
mkdir -p "$CERT_DIR"
sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$CERT_DIR/fullchain.pem"
sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem  "$CERT_DIR/privkey.pem"
sudo chmod 644 "$CERT_DIR/fullchain.pem"
sudo chmod 600 "$CERT_DIR/privkey.pem"

echo "[INFO] Please edit nginx/default.conf:"
echo "  1. Uncomment the HTTPS server block"
echo "  2. Set server_name to: $DOMAIN"
echo "  3. In the HTTP block, uncomment the redirect line"
echo ""
echo "Then restart nginx:"
echo "  docker compose restart nginx"

# Auto-renewal cron
echo "[INFO] Setting up auto-renewal cron..."
RENEW_SCRIPT="$REPO_DIR/ssl-renew.sh"
cat > "$RENEW_SCRIPT" << EOF
#!/usr/bin/env bash
docker compose -f "$REPO_DIR/docker-compose.yml" stop nginx
certbot renew --quiet
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $CERT_DIR/fullchain.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   $CERT_DIR/privkey.pem
docker compose -f "$REPO_DIR/docker-compose.yml" start nginx
EOF
chmod +x "$RENEW_SCRIPT"

# Add to crontab (run at 3am on the 1st of each month)
(crontab -l 2>/dev/null; echo "0 3 1 * * bash $RENEW_SCRIPT >> /var/log/ssl-renew.log 2>&1") | crontab -

echo "[INFO] SSL setup complete. Cert auto-renews monthly."
