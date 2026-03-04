#!/usr/bin/env bash
# =============================================================
# deploy.sh — One-shot setup & deploy on a fresh Google VPS
# (Debian / Ubuntu 22.04 / 24.04 recommended)
#
# Usage:
#   1. SSH into your VPS: ssh user@<VPS_IP>
#   2. Clone the repo:    git clone <repo-url> && cd <repo-dir>
#   3. Copy env file:     cp .env.local.example .env.local && nano .env.local
#   4. Run this script:   bash deploy.sh
# =============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${DEPLOY_BRANCH:-claude/deploy-clawbt-google-vps-YxXFV}"

# ── Colour helpers ───────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── 1. Prerequisites ─────────────────────────────────────────
info "Checking prerequisites..."

install_if_missing() {
    local cmd="$1" pkg="${2:-$1}"
    if ! command -v "$cmd" &>/dev/null; then
        warn "$cmd not found — installing..."
        sudo apt-get update -qq && sudo apt-get install -y -qq "$pkg"
    fi
}

install_if_missing git git
install_if_missing curl curl

# Docker
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    warn "Docker installed. You may need to log out and back in (or run 'newgrp docker')."
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null 2>&1; then
    info "Installing Docker Compose plugin..."
    sudo apt-get install -y -qq docker-compose-plugin
fi

# ── 2. Pull latest code ──────────────────────────────────────
info "Pulling latest code from branch: $BRANCH"
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# ── 3. Validate .env.local ───────────────────────────────────
if [[ ! -f "$REPO_DIR/.env.local" ]]; then
    error ".env.local not found!\nCopy the example and fill in your API keys:\n  cp .env.local.example .env.local && nano .env.local"
fi

info "Checking required env vars..."
required_vars=(GEMINI_API_KEY NOTION_CLIENT_ID NOTION_CLIENT_SECRET NOTION_REDIRECT_URI)
missing=()
for var in "${required_vars[@]}"; do
    if ! grep -qE "^${var}=.+" "$REPO_DIR/.env.local" 2>/dev/null; then
        missing+=("$var")
    fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing or empty env vars in .env.local: ${missing[*]}\nPlease fill them in before deploying."
fi

# ── 4. Build & start containers ──────────────────────────────
info "Building Docker image (this may take a few minutes)..."
cd "$REPO_DIR"
docker compose build --no-cache

info "Starting services..."
docker compose up -d

# ── 5. Health check ──────────────────────────────────────────
info "Waiting for app to be ready..."
max_attempts=30
for i in $(seq 1 $max_attempts); do
    if curl -sf http://localhost/healthz &>/dev/null; then
        info "App is up! ✓"
        break
    fi
    if [[ $i -eq $max_attempts ]]; then
        warn "App didn't respond after ${max_attempts}s. Check logs: docker compose logs -f"
    fi
    sleep 2
done

# ── 6. GCP Firewall reminder ─────────────────────────────────
echo ""
echo "======================================================="
info "Deployment complete!"
echo ""
echo "  Local:  http://localhost"
echo "  Public: http://$(curl -sf https://api.ipify.org || echo '<YOUR_VPS_IP>')"
echo ""
warn "Remember to open firewall ports in GCP Console:"
echo "  gcloud compute firewall-rules create allow-http  --allow tcp:80  --target-tags http-server"
echo "  gcloud compute firewall-rules create allow-https --allow tcp:443 --target-tags https-server"
echo ""
warn "To setup SSL with Let's Encrypt, run:"
echo "  bash ssl-setup.sh your-domain.com"
echo "======================================================="
