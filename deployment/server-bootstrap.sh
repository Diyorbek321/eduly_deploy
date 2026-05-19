#!/usr/bin/env bash
# Run ONCE on a fresh Ubuntu 24.04 server (as root or with sudo).
# Installs system packages, sets up Postgres, creates the systemd service,
# installs Nginx config, and runs certbot. After this finishes you only need
# to set passwords in /var/www/eduly/backend/.env and restart the service.
#
# Usage on the server:
#   sudo DOMAIN=eduly.uz EMAIL=you@eduly.uz \
#        DB_PASSWORD='change-me-now' \
#        bash /var/www/eduly/deployment/server-bootstrap.sh
set -euo pipefail

DOMAIN="${DOMAIN:?set DOMAIN=eduly.uz}"
EMAIL="${EMAIL:?set EMAIL=you@eduly.uz for Lets Encrypt}"
DB_PASSWORD="${DB_PASSWORD:?set DB_PASSWORD=...}"

echo "── 1/8  System packages"
apt-get update
apt-get install -y \
  python3 python3-pip python3-venv \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  rsync curl ufw

echo "── 2/8  Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
yes | ufw enable || true

echo "── 3/8  PostgreSQL"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='eduly_user') THEN
    CREATE USER eduly_user WITH PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER USER eduly_user WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='eduly'" | grep -q 1 \
  || sudo -u postgres createdb eduly -O eduly_user

echo "── 4/8  Backend venv + .env"
cd /var/www/eduly/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
SECRET_KEY=${SECRET}
DATABASE_URL=postgresql://eduly_user:${DB_PASSWORD}@localhost:5432/eduly
DEBUG=false
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
ACCESS_TOKEN_EXPIRE_MINUTES=30

# SMS provider — defaults to mock until GetSMS credentials are set.
SMS_PROVIDER=mock
# When you receive GetSMS credentials, switch to:
# SMS_PROVIDER=getsms
# GETSMS_LOGIN=
# GETSMS_PASSWORD=
# GETSMS_NICKNAME=
EOF
  echo "  → .env created (SECRET_KEY generated)"
else
  echo "  → .env already exists, leaving alone"
fi

echo "── 5/8  Database migrations"
alembic upgrade head

echo "── 6/8  systemd service"
cat > /etc/systemd/system/eduly.service <<EOF
[Unit]
Description=Eduly API
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/eduly/backend
EnvironmentFile=/var/www/eduly/backend/.env
ExecStart=/var/www/eduly/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
chown -R www-data:www-data /var/www/eduly
systemctl daemon-reload
systemctl enable eduly
systemctl restart eduly

echo "── 7/8  Nginx"
cp /var/www/eduly/deployment/nginx.single-domain.conf /etc/nginx/sites-available/eduly
sed -i "s/eduly\.uz/${DOMAIN}/g" /etc/nginx/sites-available/eduly
ln -sf /etc/nginx/sites-available/eduly /etc/nginx/sites-enabled/eduly
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "── 8/8  TLS via certbot"
certbot --nginx --non-interactive --agree-tos -m "${EMAIL}" \
  -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect

echo
echo "✓ Bootstrap complete."
echo "  Health check:  curl https://${DOMAIN}/api/health"
echo "  Backend logs:  journalctl -u eduly -f"
echo
echo "Next:"
echo "  1. Create your real admin user:"
echo "     cd /var/www/eduly/backend && source venv/bin/activate"
echo "     python3 create_admin.py --email you@${DOMAIN} --password 'StrongPass!'"
echo "  2. When GetSMS credentials arrive, edit /var/www/eduly/backend/.env then:"
echo "     systemctl restart eduly"
