#!/usr/bin/env bash
# Build all three frontends locally for production deployment to eduly.uz.
# Run from the repo root:   bash deployment/build-local.sh
# Outputs:
#   ./dist/                              → admin SPA  (root)
#   ./super-admin/dist/                  → super-admin SPA  (/super/)
#   ./edusaas-teacher-dashboard/dist/    → teacher dashboard (/teacher/)

set -euo pipefail

API_URL="${API_URL:-https://eduly.uz/api}"
GEMINI_KEY="${GEMINI_API_KEY:-}"

echo "── Building with VITE_API_BASE_URL=${API_URL}"

# ── Admin (root) ────────────────────────────────────────────────────────
cat > .env.production <<EOF
VITE_API_BASE_URL=${API_URL}
GEMINI_API_KEY=${GEMINI_KEY}
EOF
npm install
npm run build

# ── Super-admin (subpath /super/) ───────────────────────────────────────
pushd super-admin > /dev/null
cat > .env.production <<EOF
VITE_API_BASE_URL=${API_URL}
VITE_BASE_PATH=/super/
GEMINI_API_KEY=${GEMINI_KEY}
EOF
npm install
npm run build
popd > /dev/null

# ── Teacher dashboard (subpath /teacher/) ───────────────────────────────
pushd edusaas-teacher-dashboard > /dev/null
cat > .env.production <<EOF
VITE_API_BASE_URL=${API_URL}
VITE_BASE_PATH=/teacher/
GEMINI_API_KEY=${GEMINI_KEY}
EOF
npm install
npm run build
popd > /dev/null

echo
echo "✓ Builds complete:"
echo "  ./dist/                            (admin)"
echo "  ./super-admin/dist/                (/super/)"
echo "  ./edusaas-teacher-dashboard/dist/  (/teacher/)"
echo
echo "Next: bash deployment/upload.sh <server-ip>"
