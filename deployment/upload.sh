#!/usr/bin/env bash
# Upload built frontends + backend code to the server.
# Usage:  bash deployment/upload.sh <user@server-ip>
# Example: bash deployment/upload.sh root@5.75.123.45
set -euo pipefail

TARGET="${1:?usage: $0 <user@server-ip>}"

# 1. Backend source (excludes venv, db, caches)
rsync -az --delete \
  --exclude venv --exclude __pycache__ --exclude '*.pyc' \
  --exclude eduly.db --exclude .env \
  backend/  "${TARGET}:/var/www/eduly/backend/"

# 2. Frontends
rsync -az --delete dist/                              "${TARGET}:/var/www/eduly/admin/"
rsync -az --delete super-admin/dist/                  "${TARGET}:/var/www/eduly/super-admin/"
rsync -az --delete edusaas-teacher-dashboard/dist/    "${TARGET}:/var/www/eduly/teacher/"

# 3. Deployment configs
rsync -az deployment/                                 "${TARGET}:/var/www/eduly/deployment/"

ssh "${TARGET}" 'chown -R www-data:www-data /var/www/eduly'
echo "✓ Uploaded to ${TARGET}:/var/www/eduly"
