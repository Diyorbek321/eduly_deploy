#!/usr/bin/env bash
# Verify a live Eduly deployment.
# Usage:  bash deployment/smoke-test.sh https://eduly.uz
set -euo pipefail

BASE="${1:?usage: $0 <https://your-domain>}"
BASE="${BASE%/}"

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; exit 1; }

echo "── Smoke testing $BASE"

curl -fsS "$BASE/api/health" >/dev/null && pass "API /health"     || fail "API /health"
curl -fsSI "$BASE/"          >/dev/null && pass "Admin SPA root"  || fail "Admin SPA"
curl -fsSI "$BASE/super/"    >/dev/null && pass "Super-admin SPA" || fail "Super-admin"
curl -fsSI "$BASE/teacher/"  >/dev/null && pass "Teacher SPA"     || fail "Teacher"

# /docs must be disabled in production (DEBUG=false)
code=$(curl -fsS -o /dev/null -w '%{http_code}' "$BASE/docs" || true)
[ "$code" = "404" ] && pass "/docs disabled (404)" || fail "/docs returned $code — DEBUG may be on"

echo
echo "✓ All checks passed."
