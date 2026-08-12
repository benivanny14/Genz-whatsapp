#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Privacy regression harness — one command for the full privacy verification
# stack (the same layers CI runs):
#
#   1. Backend syntax + route-export checks   (npm run check / check:exports)
#   2. Backend unit/integration suite         (npm test — in-memory Mongo)
#   3. Frontend unit tests                    (npm test)
#   4. Frontend production build              (npm run build)
#   5. [--e2e] Privacy e2e against RUNNING servers:
#        - Playwright privacy-contact-selector spec (needs backend :5000 +
#          a reachable UI at PLAYWRIGHT_BASE_URL, default http://127.0.0.1:5174)
#        - backend/scripts/e2e-presence-privacy.js (real sockets, backend :5000)
#
# Usage:
#   bash scripts/privacy-regression.sh            # layers 1–4
#   bash scripts/privacy-regression.sh --e2e      # layers 1–5 (servers must run)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E="${1:-}"
FAILED=0

step() { echo ""; echo "════════ $* ════════"; }
ok()   { echo "  ✅ $*"; }
bad()  { echo "  ❌ $*"; FAILED=1; }

cd "$ROOT"

step "Backend syntax check"
(cd backend && npm run check > /tmp/privacy-reg-check.log 2>&1) && ok "npm run check" || { bad "npm run check"; tail -5 /tmp/privacy-reg-check.log; }

step "Backend route/export check"
(cd backend && npm run check:exports > /tmp/privacy-reg-exports.log 2>&1) && ok "npm run check:exports" || { bad "npm run check:exports"; tail -5 /tmp/privacy-reg-exports.log; }

step "Backend test suite"
(cd backend && npm test > /tmp/privacy-reg-backend.log 2>&1) && ok "backend tests" || { bad "backend tests"; grep -E "FAIL|✕" /tmp/privacy-reg-backend.log | head -10; }

step "Frontend unit tests"
(cd frontend && npm test > /tmp/privacy-reg-frontend.log 2>&1) && ok "frontend tests" || { bad "frontend tests"; tail -15 /tmp/privacy-reg-frontend.log; }

step "Frontend production build"
(cd frontend && npm run build > /tmp/privacy-reg-build.log 2>&1) && ok "frontend build" || { bad "frontend build"; tail -15 /tmp/privacy-reg-build.log; }

if [ "$E2E" = "--e2e" ]; then
  BASE="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:5174}"

  step "E2E: privacy-contact-selector spec (Playwright)"
  (cd frontend && PLAYWRIGHT_BASE_URL="$BASE" npx playwright test privacy-contact-selector --reporter=line > /tmp/privacy-reg-e2e.log 2>&1) \
    && ok "privacy-contact-selector spec" || { bad "privacy-contact-selector spec"; tail -20 /tmp/privacy-reg-e2e.log; }

  step "E2E: presence privacy via real sockets"
  (cd backend && node scripts/e2e-presence-privacy.js http://127.0.0.1:5000 > /tmp/privacy-reg-presence.log 2>&1) \
    && ok "presence privacy socket e2e" || { bad "presence privacy socket e2e"; tail -15 /tmp/privacy-reg-presence.log; }

  step "E2E: feature smoke test (137 checks)"
  (cd backend && node scripts/feature-smoke-test.js > /tmp/privacy-reg-smoke.log 2>&1) \
    && ok "feature smoke test" || { bad "feature smoke test"; tail -20 /tmp/privacy-reg-smoke.log; }

  step "E2E: feature full verification (186 checks: status/chat/group/settings/admin)"
  (cd backend && node scripts/feature-full-verification.js > /tmp/privacy-reg-fv.log 2>&1) \
    && ok "feature full verification" || { bad "feature full verification"; tail -25 /tmp/privacy-reg-fv.log; }
fi

echo ""
if [ "$FAILED" = "0" ]; then
  echo "🎉 Privacy regression: ALL CHECKS PASSED"
  exit 0
else
  echo "💥 Privacy regression: SOME CHECKS FAILED (see logs above)"
  exit 1
fi
