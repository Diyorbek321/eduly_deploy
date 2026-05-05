# Eduly — `amorabox` Domeniga Deployment Qo'llanmasi

DigitalOcean Basic droplet ($6/oy, 1 vCPU / 1GB RAM / 35GB) uchun **single-domain** layout.

> Bu fayl `deploy.md` ning soddalashtirilgan, `amorabox` domeni va 1GB RAM uchun moslashtirilgan versiyasi.

---

## 0. Mahalliy kompyuterda — SSH key yarating

```bash
ssh-keygen -t ed25519 -C "dturgunboyev635@gmail.com"
# Enter ni bosing (default joy: ~/.ssh/id_ed25519)
# Passphrase: kuchli parol (yoki bo'sh)

cat ~/.ssh/id_ed25519.pub
```

Chiqqan natijani DigitalOcean'ning "SSH Key content" maydoniga **butunligicha** joylashtiring.
Key name: `diyorbek-laptop`

> **Backups: hozircha yoqmang.** Test qilib bo'lib, production'ga o'tganingizda yoqasiz.
> **Startup script: bo'sh qoldiring.**
> **Droplet name:** `eduly-prod` yoki `amorabox`

---

## 1. DNS — domen registrar'da

Domen sotib olingach (`amorabox.uz` deb taxmin qilamiz), DNS panel'ida:

| Type | Host | Value             |
|------|------|-------------------|
| A    | @    | `<DROPLET_IP>`    |
| A    | www  | `<DROPLET_IP>`    |

Tekshirish:
```bash
dig amorabox.uz +short    # → droplet IP chiqishi kerak (5-15 daqiqada)
```

---

## 2. Serverga ulanish

```bash
ssh root@<DROPLET_IP>
```

---

## 3. Server tayyorlash (server bootstrap)

```bash
apt update && apt upgrade -y

# Asosiy paketlar
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx \
               postgresql postgresql-contrib nodejs npm git ufw

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 2GB swap (1GB RAM kam — Postgres + FastAPI + Nginx)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 4. PostgreSQL bazasi

Kuchli parol yarating va eslab qoling:
```bash
DB_PASSWORD=$(openssl rand -base64 24)
echo "DB password: $DB_PASSWORD"   # YOZIB OLING

sudo -u postgres psql <<EOF
CREATE USER eduly_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
CREATE DATABASE eduly OWNER eduly_user;
GRANT ALL PRIVILEGES ON DATABASE eduly TO eduly_user;
EOF
```

---

## 5. Backend kodni yuklash

Kodni Git orqali yoki `scp` orqali yuklang:

```bash
mkdir -p /var/www/eduly
cd /var/www/eduly
git clone <SIZNING_REPO_URL> .
# yoki: scp -r mahalliy/papka root@IP:/var/www/eduly/

cd /var/www/eduly/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install psycopg2-binary
```

`.env` faylni yarating:
```bash
SECRET=$(openssl rand -hex 32)

cat > /var/www/eduly/backend/.env <<EOF
DEBUG=false
DATABASE_URL=postgresql://eduly_user:$DB_PASSWORD@localhost:5432/eduly
SECRET_KEY=$SECRET
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=https://amorabox.uz,https://www.amorabox.uz
EDULY_TZ=Asia/Tashkent
EOF
chmod 600 /var/www/eduly/backend/.env
```

Migratsiyalar va admin yaratish:
```bash
cd /var/www/eduly/backend && source venv/bin/activate
alembic upgrade head

# Default admin ($SECRET_KEY ga shunga o'xshash kuchli parol):
ADMIN_PASS=$(openssl rand -base64 18)
echo "Admin password: $ADMIN_PASS"   # YOZIB OLING
python3 create_admin.py --email you@amorabox.uz --password "$ADMIN_PASS"
```

---

## 6. Backend systemd service

```bash
cat > /etc/systemd/system/eduly.service <<'EOF'
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

chown -R www-data:www-data /var/www/eduly
systemctl daemon-reload
systemctl enable --now eduly
systemctl status eduly        # active (running) bo'lishi kerak
```

Tekshirish:
```bash
curl http://127.0.0.1:8000/api/health
# → {"success":true,"data":{"status":"ok"},...}
```

---

## 7. Frontend build (mahalliy kompyuterda)

3 ta SPA ham single-domain layout uchun build qilingan `.env.production` fayllar bilan keladi (allaqachon to'g'ri sozlangan):

```bash
# Repo root'da
cd /path/to/eduly

# 1) Asosiy admin → /
npm install
npm run build                          # → dist/

# 2) Super-admin → /super/
( cd super-admin && npm install && npm run build )   # → super-admin/dist/

# 3) Teacher dashboard → /teacher/
( cd edusaas-teacher-dashboard && npm install && npm run build )  # → edusaas-teacher-dashboard/dist/
```

Serverga yuborish (mahalliy kompyuterdan):
```bash
ssh root@<IP> "mkdir -p /var/www/eduly/{admin,super-admin,teacher}"

rsync -avz --delete dist/                              root@<IP>:/var/www/eduly/admin/
rsync -avz --delete super-admin/dist/                  root@<IP>:/var/www/eduly/super-admin/
rsync -avz --delete edusaas-teacher-dashboard/dist/    root@<IP>:/var/www/eduly/teacher/

ssh root@<IP> "chown -R www-data:www-data /var/www/eduly"
```

---

## 8. Nginx + HTTPS

```bash
# Domen nomini almashtirish (agar amorabox.uz emas bo'lsa)
sed -i 's/amorabox\.uz/SIZNING_DOMENINGIZ/g' /var/www/eduly/deployment/nginx.amorabox.conf

# O'rnatish
cp /var/www/eduly/deployment/nginx.amorabox.conf /etc/nginx/sites-available/eduly
ln -sf /etc/nginx/sites-available/eduly /etc/nginx/sites-enabled/eduly
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Let's Encrypt sertifikat
certbot --nginx -d amorabox.uz -d www.amorabox.uz
# Email kiriting, shartlarga rozi bo'ling, redirect uchun "2" ni tanlang
```

---

## 9. Backup cron

```bash
mkdir -p /var/backups/eduly

cat > /usr/local/bin/eduly-backup <<'EOF'
#!/bin/bash
DATE=$(date +%F)
PGPASSWORD=$(grep DATABASE_URL /var/www/eduly/backend/.env | sed 's/.*:\([^@]*\)@.*/\1/')
sudo -u postgres pg_dump eduly | gzip > /var/backups/eduly/eduly-$DATE.sql.gz
find /var/backups/eduly -mtime +14 -delete
EOF
chmod +x /usr/local/bin/eduly-backup

# Har kuni ertalab 2:00 da
echo "0 2 * * * /usr/local/bin/eduly-backup >> /var/log/eduly-backup.log 2>&1" | crontab -
```

---

## 10. Yakuniy tekshirish

```bash
curl -I https://amorabox.uz/                  # 200 OK
curl    https://amorabox.uz/api/health        # {"success":true,...}
curl -I https://amorabox.uz/super/            # 200
curl -I https://amorabox.uz/teacher/          # 200
curl -I https://amorabox.uz/docs              # 404 (yopilgan — OK!)

journalctl -u eduly -f                        # backend loglari
```

Brauzer'da `https://amorabox.uz` ni oching, admin email/parol bilan kiring.

---

## Yangilanish (kelajakda)

```bash
# Backend yangilash
cd /var/www/eduly && git pull
cd backend && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart eduly

# Frontend yangilash (mahalliy kompyuterda build → rsync)
npm run build && rsync -avz --delete dist/ root@<IP>:/var/www/eduly/admin/
```

---

## Production'ga o'tganda (test bosqichidan keyin)

DigitalOcean dashboard → droplet → **Backups** → **Enable** ($1.20/oy).
Birinchi kun manual snapshot ham oling: **Snapshots** → **Take Snapshot**.

---

## Asosiy o'zgarishlar (kod tomondan, oldindan tayyorlangan)

✅ `vite.config.ts` (3 ta) — Gemini API kalit production bundle'ga qo'shilmaydi
✅ `backend/app/main.py` — `/docs` va `/redoc` `DEBUG=false` da o'chiriladi
✅ `deployment/nginx.amorabox.conf` — single-domain layout, `/docs` 404
✅ `.env.production` (3 ta SPA) — single-domain `/api` ga ishora qiladi
✅ `backend/.gitignore` — `.env`, `*.db`, `venv/` ni himoya qiladi
✅ Frontend allaqachon `VITE_API_BASE_URL` env'dan o'qiydi
✅ Backend allaqachon `SECRET_KEY` ni majburiy talab qiladi (default yo'q)
✅ Backend allaqachon `slowapi` rate-limit ishlatadi (login brute-force himoyasi)
