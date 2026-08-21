#!/bin/bash
# ============================
# SSL Certificate Setup (Let's Encrypt)
# ============================
# Run after DNS is pointing to this server.
# Usage: ./deploy/ssl-setup.sh api.tukangndeso.id

DOMAIN=${1:-api.tukangndeso.id}

echo "=== SSL Setup for $DOMAIN ==="

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  apt-get update && apt-get install -y certbot
fi

# Get certificate
certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email admin@tukangndeso.id \
  -d $DOMAIN

# Copy certs to nginx ssl directory
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem deploy/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem deploy/nginx/ssl/privkey.pem

echo ""
echo "SSL certificates installed!"
echo "Now uncomment the SSL lines in deploy/nginx/nginx.conf and restart:"
echo "  docker compose -f docker-compose.prod.yml restart nginx"

# Setup auto-renewal cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $(pwd)/deploy/nginx/ssl/fullchain.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $(pwd)/deploy/nginx/ssl/privkey.pem && docker compose -f $(pwd)/docker-compose.prod.yml restart nginx") | crontab -
echo "Auto-renewal cron added (daily at 3 AM)"
