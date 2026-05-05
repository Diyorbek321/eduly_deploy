# Phase 1: Security Implementation Plan

**Timeline:** Week 1
**Goal:** Make the backend secure enough that real user data can be safely stored

---

## Task 1: SECRET_KEY from Environment Variable

**File:** `backend/app/config.py`
**Time:** 15 minutes
**Risk:** CRITICAL - without this, anyone can forge admin tokens

### What to do:
1. Open `backend/app/config.py`
2. Change the `SECRET_KEY` field from the hardcoded string to read from environment variable with NO default value (force it to be set)
3. Create `backend/.env` file with a generated key
4. Add `backend/.env` to `.gitignore` (NEVER commit this file)
5. Create `backend/.env.example` with placeholder values for documentation

### How to generate a key:
```bash
openssl rand -hex 32
```

### Config change:
```python
# BEFORE (insecure)
SECRET_KEY: str = "CHANGE-ME-in-production-use-openssl-rand-hex-32"

# AFTER (secure)
SECRET_KEY: str  # No default - app crashes if not set, which is what we want
```

### .env file:
```
SECRET_KEY=<paste-your-generated-key-here>
DATABASE_URL=sqlite:///./eduly.db
DEBUG=false
```

### .env.example file (committed to git):
```
SECRET_KEY=generate-with-openssl-rand-hex-32
DATABASE_URL=sqlite:///./eduly.db
DEBUG=false
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## Task 2: PostgreSQL Support

**Files:** `backend/app/config.py`, `backend/app/database.py`, `backend/requirements.txt`
**Time:** 30 minutes
**Risk:** HIGH - SQLite will corrupt data with concurrent users

### What to do:
1. Add `psycopg2-binary` to `backend/requirements.txt`
2. In `backend/app/database.py`, make `connect_args` conditional - only use `check_same_thread: False` when the URL starts with `sqlite`
3. In `backend/app/config.py`, change `DATABASE_URL` default to still allow SQLite for local development but accept PostgreSQL via env var

### database.py change:
```python
# BEFORE
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# AFTER
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
engine = create_engine(DATABASE_URL, connect_args=connect_args)
```

### For production:
```
DATABASE_URL=postgresql://eduly_user:strongpassword@localhost:5432/eduly_db
```

### PostgreSQL setup commands (on production server):
```bash
sudo apt install postgresql
sudo -u postgres psql
CREATE USER eduly_user WITH PASSWORD 'strongpassword';
CREATE DATABASE eduly_db OWNER eduly_user;
\q
```

---

## Task 3: Alembic Database Migrations

**Files:** New `backend/alembic/` directory, `backend/alembic.ini`
**Time:** 1 hour
**Risk:** HIGH - without this, you cannot change the database schema after launch

### What to do:
1. Install alembic: add `alembic` to `requirements.txt`
2. Run `alembic init alembic` inside `backend/` directory
3. Edit `alembic/env.py` to import your models and use your `DATABASE_URL` from config
4. Edit `alembic.ini` to read database URL from environment (not hardcode it)
5. Generate initial migration from existing models: `alembic revision --autogenerate -m "initial"`
6. Remove `Base.metadata.create_all()` from `main.py` - Alembic handles table creation now

### Key files to create/edit:
- `backend/alembic.ini` - Alembic config (set `sqlalchemy.url` to empty, override in env.py)
- `backend/alembic/env.py` - Import `Base` from your models, import `DATABASE_URL` from config
- `backend/alembic/versions/` - Auto-generated migration files

### Daily workflow after setup:
```bash
# After changing a model:
cd backend
alembic revision --autogenerate -m "add phone field to teacher"
alembic upgrade head

# To rollback:
alembic downgrade -1
```

### Important:
- Migration files MUST be committed to git
- Run `alembic upgrade head` on every deployment
- Never edit a migration that has already been applied to production

---

## Task 4: CORS Restriction

**File:** `backend/app/config.py`, `backend/app/main.py`
**Time:** 15 minutes
**Risk:** MEDIUM - open CORS lets any website make authenticated requests

### What to do:
1. In `config.py`, make `CORS_ORIGINS` configurable via env var (comma-separated string)
2. In `main.py`, restrict `allow_methods` and `allow_headers` to only what's needed

### config.py:
```python
CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
```

### main.py CORS setup:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### For production .env:
```
CORS_ORIGINS=https://eduly.uz
```

---

## Task 5: Rate Limiting

**Files:** `backend/requirements.txt`, `backend/app/main.py`, `backend/app/routers/auth.py`
**Time:** 45 minutes
**Risk:** MEDIUM - without this, login can be brute-forced

### What to do:
1. Add `slowapi` to `requirements.txt`
2. Create a rate limiter instance in `main.py`
3. Apply strict limit to login endpoint: 5 requests per minute per IP
4. Apply general limit to all other endpoints: 120 requests per minute per IP

### Implementation:
```python
# main.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
```

### Login endpoint:
```python
# auth.py
@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, ...):
    ...
```

### Rate limit response:
When rate limit is exceeded, the API returns HTTP 429 with:
```json
{"detail": "Too many requests. Please try again later."}
```

---

## Task 6: Refresh Token System

**Files:** `backend/app/core/security.py`, `backend/app/routers/auth.py`, `backend/app/models/models.py`, frontend `AuthContext.tsx`, frontend `api.ts`
**Time:** 3-4 hours (biggest task in Phase 1)
**Risk:** HIGH - 24-hour tokens are a major security risk

### Backend changes:

**Step 1: Add RefreshToken model**
New database table to store refresh tokens:
- `id` (primary key)
- `user_id` (foreign key to User)
- `token` (unique random string, 64 chars)
- `expires_at` (datetime, 7 days from creation)
- `revoked` (boolean, default false)
- `created_at` (datetime)

**Step 2: Update security.py**
- Reduce access token expiry from 1440 minutes to 15 minutes
- Add `create_refresh_token()` function that generates a random token string, saves to DB, returns it
- Add `verify_refresh_token()` function that checks token exists, not revoked, not expired

**Step 3: Update auth router**
- `POST /auth/login` - returns both `access_token` AND `refresh_token`. Set refresh token as httpOnly cookie.
- `POST /auth/refresh` - NEW endpoint. Accepts refresh token (from cookie), verifies it, issues new access token. Old refresh token is revoked and new one is issued (rotation).
- `POST /auth/logout` - NEW endpoint. Revokes the refresh token.

**Step 4: Token structure**
```
Login response:
{
  "access_token": "eyJ...",    // JWT, 15 min expiry, in response body
  "token_type": "bearer"
}
+ Set-Cookie: refresh_token=abc123; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
```

### Frontend changes:

**Step 1: Update api.ts interceptor**
- When a request gets 401, automatically call `POST /api/auth/refresh` (the cookie is sent automatically)
- If refresh succeeds, retry the original request with the new access token
- If refresh fails (refresh token also expired), redirect to login

**Step 2: Update AuthContext.tsx**
- Remove `token` from localStorage (less exposure)
- Store access token only in memory (React state)
- On page reload, call `/auth/refresh` to get a new access token (the httpOnly cookie persists)
- Add `logout()` that calls `/auth/logout` to revoke refresh token

### Token lifecycle:
```
1. User logs in -> gets access_token (15 min) + refresh_token cookie (7 days)
2. User makes API calls with access_token in Authorization header
3. After 15 min, access_token expires -> 401
4. Frontend interceptor catches 401 -> calls /auth/refresh
5. Backend validates refresh cookie -> issues new access_token + new refresh cookie
6. Frontend retries original request with new access_token
7. After 7 days of no activity, refresh_token expires -> user must login again
```

---

## Task 7: Remove Default Admin Credentials

**File:** `backend/app/main.py` (or wherever seed data is created)
**Time:** 15 minutes
**Risk:** MEDIUM - anyone who reads BACKEND_DOCS.md knows the admin password

### What to do:
1. Find where the default admin user (`admin@edusaas.com` / `Admin1234!`) is created
2. Change it so default admin is only created when `DEBUG=true` OR via a one-time setup command
3. For production: create admin via CLI command instead of auto-creation

### Option A: Environment-gated seed
```python
# Only seed default admin in development
if settings.DEBUG:
    create_default_admin(db)
```

### Option B: CLI command (better)
Create `backend/create_admin.py`:
```bash
python create_admin.py --email admin@eduly.uz --password <strong-password>
```

This script:
1. Prompts for email and password (or accepts CLI args)
2. Validates password strength (min 12 chars, uppercase, lowercase, number, special char)
3. Creates the admin user
4. Prints confirmation

---

## Task 8: HTTPS Setup (Nginx + Let's Encrypt)

**Files:** New `nginx.conf`, server configuration
**Time:** 1-2 hours (on production server)
**Risk:** CRITICAL - without HTTPS, passwords travel in plain text

### This is done on the production server, not in the codebase.

### Nginx config structure:
```
/etc/nginx/sites-available/eduly.conf

server {
    listen 80;
    server_name eduly.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name eduly.uz;

    ssl_certificate /etc/letsencrypt/live/eduly.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/eduly.uz/privkey.pem;

    # Frontend (built static files)
    location / {
        root /var/www/eduly/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL setup commands:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d eduly.uz
# Auto-renewal is set up automatically
```

### Backend systemd service:
```
/etc/systemd/system/eduly-api.service

[Unit]
Description=Eduly API
After=network.target postgresql.service

[Service]
User=eduly
WorkingDirectory=/var/www/eduly/backend
EnvironmentFile=/var/www/eduly/backend/.env
ExecStart=/var/www/eduly/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Implementation Order

Do the tasks in this order because each builds on the previous:

| Order | Task | Time | Can Do Locally |
|-------|------|------|----------------|
| 1 | SECRET_KEY from env | 15 min | Yes |
| 2 | PostgreSQL support | 30 min | Yes (keep SQLite for dev) |
| 3 | CORS restriction | 15 min | Yes |
| 4 | Remove default admin | 15 min | Yes |
| 5 | Rate limiting | 45 min | Yes |
| 6 | Alembic migrations | 1 hr | Yes |
| 7 | Refresh token system | 3-4 hr | Yes |
| 8 | HTTPS + Nginx | 1-2 hr | Production server only |

**Total estimated time: ~7-8 hours**

---

## How to Test Each Task

| Task | How to Verify |
|------|---------------|
| SECRET_KEY | Remove `.env` file -> app should crash on startup with "SECRET_KEY not set" |
| PostgreSQL | Set `DATABASE_URL` to PostgreSQL -> app starts, data persists |
| CORS | Open browser console, make request from `http://evil.com` -> should be blocked |
| Default admin | Start app with `DEBUG=false` -> no admin user auto-created |
| Rate limiting | Run `for i in {1..10}; do curl -X POST /api/auth/login; done` -> get 429 after 5th |
| Alembic | Add a column to a model -> `alembic revision --autogenerate` creates migration -> `alembic upgrade head` applies it |
| Refresh token | Login -> wait 15 min -> make API call -> should auto-refresh without redirect to login |
| HTTPS | Open `https://eduly.uz` -> green lock in browser, `http://` redirects to `https://` |

---

## Files Changed Summary

| File | Change |
|------|--------|
| `backend/app/config.py` | SECRET_KEY from env, CORS from env, reduce token expiry |
| `backend/app/database.py` | Conditional connect_args for SQLite vs PostgreSQL |
| `backend/app/main.py` | CORS restriction, rate limiter setup, remove auto-seed |
| `backend/app/core/security.py` | Refresh token creation/verification functions |
| `backend/app/routers/auth.py` | `/refresh` and `/logout` endpoints, login returns refresh cookie |
| `backend/app/models/models.py` | New `RefreshToken` model |
| `backend/requirements.txt` | Add `psycopg2-binary`, `slowapi`, `alembic` |
| `backend/.env` | New file (not committed) |
| `backend/.env.example` | New file (committed) |
| `backend/.gitignore` | Add `.env` |
| `backend/alembic.ini` | New file |
| `backend/alembic/` | New directory (migrations) |
| `backend/create_admin.py` | New CLI script |
| `src/lib/api.ts` | 401 interceptor -> auto-refresh logic |
| `src/contexts/AuthContext.tsx` | Token in memory, refresh on reload |
