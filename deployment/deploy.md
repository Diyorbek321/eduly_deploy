# Eduly - Deployment Guide

## Prerequisites
- Ubuntu 22.04+ VPS (2 CPU, 4GB RAM minimum)
- Domain name pointing to server IP
- SSH access

## Step 1: Server Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx postgresql postgresql-contrib nodejs npm
```

## Step 2: PostgreSQL Database

```bash
sudo -u postgres createuser eduly_user
sudo -u postgres createdb eduly -O eduly_user
sudo -u postgres psql -c "ALTER USER eduly_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
```

## Step 3: Backend Deployment

```bash
# Clone / upload code to /var/www/eduly
cd /var/www/eduly/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
cat > .env << 'EOF'
SECRET_KEY=<run: openssl rand -hex 32>
DATABASE_URL=postgresql://eduly_user:YOUR_STRONG_PASSWORD@localhost:5432/eduly
DEBUG=false
CORS_ORIGINS=https://yourdomain.com
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

# Run migrations
alembic upgrade head

# Create admin user
python3 create_admin.py --email admin@yourdomain.com --password "YourStr0ng!Pass12"

# Seed sample data (optional)
# python3 seed.py
```

## Step 4: Backend Service (systemd)

```bash
sudo tee /etc/systemd/system/eduly.service << 'EOF'
[Unit]
Description=Eduly API
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/eduly/backend
Environment="PATH=/var/www/eduly/backend/venv/bin"
ExecStart=/var/www/eduly/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable eduly
sudo systemctl start eduly
```

## Step 5: DNS (do this BEFORE certbot)

In your registrar (where you bought `eduly.uz`), create A records pointing every
subdomain to the server's public IP:

| Type | Host       | Value          |
|------|------------|----------------|
| A    | @          | YOUR_SERVER_IP |
| A    | www        | YOUR_SERVER_IP |
| A    | api        | YOUR_SERVER_IP |
| A    | super      | YOUR_SERVER_IP |
| A    | teacher    | YOUR_SERVER_IP |

Wait until `dig api.eduly.uz +short` returns the server IP before running certbot.

## Step 6: Build the three frontends (run on your laptop OR on the server)

Each frontend reads `VITE_API_BASE_URL` at build time. Create a
`.env.production` file in each app folder before `npm run build` — see
`/.env.production.example` at the repo root for the contents.

```bash
# Repo root
cd /path/to/eduly

# Main admin → eduly.uz
( cd .             && cp .env.production.example .env.production  # then trim to one block
  npm install && npm run build )                                  # outputs /dist

# Super-admin → super.eduly.uz
( cd super-admin
  echo "VITE_API_BASE_URL=https://api.eduly.uz/api" > .env.production
  npm install && npm run build )                                  # outputs super-admin/dist

# Teacher dashboard → teacher.eduly.uz
( cd edusaas-teacher-dashboard
  echo "VITE_API_BASE_URL=https://api.eduly.uz/api" > .env.production
  npm install && npm run build )                                  # outputs edusaas-teacher-dashboard/dist
```

Upload the three `dist/` folders to the server in the layout the Nginx config
expects:

```bash
# On the server
sudo mkdir -p /var/www/eduly/{admin,super-admin,teacher}
sudo rsync -a --delete /tmp/dist/                       /var/www/eduly/admin/
sudo rsync -a --delete /tmp/super-admin-dist/           /var/www/eduly/super-admin/
sudo rsync -a --delete /tmp/teacher-dist/               /var/www/eduly/teacher/
sudo chown -R www-data:www-data /var/www/eduly
```

## Step 7: Nginx + SSL

```bash
# Install the multi-subdomain config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/eduly
sudo ln -sf /etc/nginx/sites-available/eduly /etc/nginx/sites-enabled/eduly
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t

# Get one cert that covers every subdomain (DNS must already resolve)
sudo certbot --nginx \
  -d eduly.uz -d www.eduly.uz \
  -d api.eduly.uz -d super.eduly.uz -d teacher.eduly.uz

sudo systemctl reload nginx
```

## Step 8: Rotate the default admin (do NOT skip)

`create_admin.py` ships with the default `admin@edusaas.com / Admin1234!`.
Anyone who reads the source knows this. Create a real admin and disable the
default one:

```bash
cd /var/www/eduly/backend && source venv/bin/activate

# Create your real admin
python3 create_admin.py --email you@eduly.uz --password "$(openssl rand -base64 24)"
# → save the printed password in a password manager

# Then log into https://eduly.uz with the new account, go to user management,
# and DELETE or DEACTIVATE admin@edusaas.com.
```

## Step 9: Database backup cron

```bash
sudo cp deployment/backup.sh /usr/local/bin/eduly-backup
sudo chmod +x /usr/local/bin/eduly-backup

# Daily at 02:00 server time
echo "0 2 * * * /usr/local/bin/eduly-backup >> /var/log/eduly-backup.log 2>&1" | sudo crontab -
```

## Step 10: Verify

```bash
curl https://api.eduly.uz/api/health         # → {"status":"ok"}
curl -I https://eduly.uz/                    # → 200, content-type text/html
curl -I https://super.eduly.uz/              # → 200
curl -I https://teacher.eduly.uz/            # → 200

sudo journalctl -u eduly -f                  # tail backend logs
```

## Re-deploying after changes

```bash
# Backend update
cd /var/www/eduly/backend && git pull
source venv/bin/activate && pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart eduly

# Frontend update — rebuild whichever app changed, rsync new dist/, no Nginx reload needed
```
