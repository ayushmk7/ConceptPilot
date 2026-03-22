#!/usr/bin/env bash
# ============================================================================
# ConceptPilot Backend — Vultr One-Shot Deploy
#
# This script runs ON the Vultr server. It:
#   1. Installs Docker + Nginx + Certbot
#   2. Builds the Docker image
#   3. Runs Alembic migrations against your Neon Postgres
#   4. Starts the container on port 8000
#   5. Sets up Nginx reverse proxy with SSL
#
# Usage:
#   ssh root@<VULTR_IP> 'bash -s' < deploy/setup-vultr.sh
#   — OR —
#   scp the whole backend/ to the server, ssh in, and run it there.
# ============================================================================

set -euo pipefail

APP_DIR="/opt/conceptpilot"
CONTAINER_NAME="conceptpilot-api"

echo "============================================"
echo " ConceptPilot Backend — Vultr Deploy"
echo "============================================"

# ----- 1. Prompt for domain (needed for nginx + SSL) -----
read -rp "Enter your API domain (e.g. api.conceptpilot.com), or press Enter to skip SSL: " DOMAIN
read -rp "Enter your frontend URL for CORS (e.g. https://conceptpilot.com): " FRONTEND_URL

# ----- 2. Install Docker, Nginx, Certbot -----
echo ""
echo ">>> Installing Docker, Nginx, Certbot..."
apt-get update -qq
apt-get install -y -qq docker.io nginx certbot python3-certbot-nginx > /dev/null
systemctl enable docker && systemctl start docker
echo "    Done."

# ----- 3. Set up firewall -----
echo ">>> Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow OpenSSH > /dev/null 2>&1 || true
    ufw allow 80 > /dev/null 2>&1 || true
    ufw allow 443 > /dev/null 2>&1 || true
    yes | ufw enable > /dev/null 2>&1 || true
    echo "    UFW configured (22, 80, 443 open)."
else
    echo "    No ufw found, skipping. Make sure ports 80/443 are open in Vultr firewall."
fi

# ----- 4. Copy app if not already in place -----
if [ ! -f "$APP_DIR/Dockerfile" ]; then
    echo ""
    echo "ERROR: Backend code not found at $APP_DIR/Dockerfile"
    echo ""
    echo "Copy the backend folder to the server first:"
    echo "  scp -r ./backend root@<VULTR_IP>:/opt/conceptpilot"
    echo ""
    echo "Then re-run this script on the server."
    exit 1
fi

# ----- 5. Create production .env if missing -----
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "ERROR: No .env file found at $APP_DIR/.env"
    echo ""
    echo "Copy your local .env to the server first:"
    echo "  scp ./backend/.env root@<VULTR_IP>:/opt/conceptpilot/.env"
    echo ""
    echo "Then re-run this script on the server."
    exit 1
fi

# Patch .env for production
echo ">>> Patching .env for production..."
sed -i "s|^APP_ENV=.*|APP_ENV=production|" "$APP_DIR/.env"
sed -i "s|^DATABASE_SSL_MODE=.*|DATABASE_SSL_MODE=require|" "$APP_DIR/.env"

if [ -n "$FRONTEND_URL" ]; then
    sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=$FRONTEND_URL|" "$APP_DIR/.env"
    echo "    CORS set to: $FRONTEND_URL"
fi
echo "    APP_ENV=production, DATABASE_SSL_MODE=require"

# ----- 6. Build Docker image -----
echo ""
echo ">>> Building Docker image..."
cd "$APP_DIR"
docker build -t "$CONTAINER_NAME" .
echo "    Done."

# ----- 7. Run migrations -----
echo ""
echo ">>> Running Alembic migrations against Neon Postgres..."
docker run --rm --env-file "$APP_DIR/.env" "$CONTAINER_NAME" alembic upgrade head
echo "    Done."

# ----- 8. Stop old container if running -----
echo ""
echo ">>> Starting container..."
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --env-file "$APP_DIR/.env" \
    -p 127.0.0.1:8000:8000 \
    "$CONTAINER_NAME"

# Wait for it to come up
sleep 3
if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "    Container is healthy!"
else
    echo "    WARNING: Health check failed. Check logs with:"
    echo "      docker logs $CONTAINER_NAME"
fi

# ----- 9. Set up Nginx reverse proxy -----
if [ -n "$DOMAIN" ]; then
    echo ""
    echo ">>> Configuring Nginx for $DOMAIN..."

    cat > /etc/nginx/sites-available/conceptpilot <<NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support (canvas collaboration)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts for long-running AI requests
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX_EOF

    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/conceptpilot /etc/nginx/sites-enabled/
    nginx -t && systemctl restart nginx
    echo "    Nginx configured."

    # ----- 10. SSL via Certbot -----
    echo ""
    echo ">>> Getting SSL certificate for $DOMAIN..."
    echo "    (Make sure DNS for $DOMAIN points to this server's IP first!)"
    read -rp "    DNS ready? [y/N]: " DNS_READY
    if [[ "$DNS_READY" =~ ^[Yy]$ ]]; then
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
            echo "    Certbot failed. You can retry later with:"
            echo "      certbot --nginx -d $DOMAIN"
        }
    else
        echo "    Skipping SSL. Point DNS, then run:"
        echo "      certbot --nginx -d $DOMAIN"
    fi
else
    echo ""
    echo ">>> No domain provided, skipping Nginx/SSL setup."
    echo "    API is available at http://<SERVER_IP>:8000"
    echo "    Open port 8000 in your Vultr firewall to access externally."
fi

# ----- Done -----
echo ""
echo "============================================"
echo " DEPLOY COMPLETE"
echo "============================================"
echo ""
echo " Health check:  curl http://127.0.0.1:8000/health"
echo " API docs:      http://${DOMAIN:-<SERVER_IP>:8000}/docs"
echo " Logs:          docker logs -f $CONTAINER_NAME"
echo " Restart:       docker restart $CONTAINER_NAME"
echo " Redeploy:      docker build -t $CONTAINER_NAME . && docker rm -f $CONTAINER_NAME && docker run -d --name $CONTAINER_NAME --restart unless-stopped --env-file .env -p 127.0.0.1:8000:8000 $CONTAINER_NAME"
echo ""
