#!/bin/bash
# ============================
# TukangNDeso Deploy Script
# ============================
# Usage: ./deploy/deploy.sh
# Run from the project root directory on the production server.

set -e

echo "=== TukangNDeso Production Deploy ==="
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo "Copy deploy/.env.production to .env and fill in real values."
  exit 1
fi

# Load env
source .env

# Validate critical env vars
if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "CHANGE_ME_STRONG_PASSWORD_HERE" ]; then
  echo "ERROR: DB_PASSWORD not configured in .env"
  exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE_ME_GENERATE_WITH_openssl_rand_base64_48" ]; then
  echo "ERROR: JWT_SECRET not configured in .env"
  exit 1
fi

echo "[1/5] Building API Docker image..."
docker compose -f docker-compose.prod.yml build api

echo "[2/5] Pulling latest images..."
docker compose -f docker-compose.prod.yml pull postgres redis nginx

echo "[3/5] Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "[4/5] Waiting for database..."
sleep 5

# Run migrations (the SQL files are auto-run on first postgres start via docker-entrypoint-initdb.d)
# For subsequent migrations, run manually:
# docker exec -i tukangndeso-db psql -U $DB_USER -d $DB_NAME < api/prisma/new_migration.sql

echo "[5/5] Verifying..."
sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "=== Deploy SUCCESS ==="
  echo "API:    http://localhost:3000"
  echo "Nginx:  http://localhost (port 80)"
  echo ""
  echo "Next steps:"
  echo "  1. Point DNS api.tukangndeso.id → this server IP"
  echo "  2. Setup SSL with certbot:"
  echo "     certbot certonly --webroot -w /var/www/html -d api.tukangndeso.id"
  echo "  3. Copy certs to deploy/nginx/ssl/ and uncomment SSL in nginx.conf"
  echo "  4. docker compose -f docker-compose.prod.yml restart nginx"
else
  echo ""
  echo "WARNING: Health check returned HTTP $HTTP_CODE"
  echo "Check logs: docker compose -f docker-compose.prod.yml logs api"
fi
