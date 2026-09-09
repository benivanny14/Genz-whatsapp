#!/bin/bash

# privacy-regression.sh
# --------------------
# Privacy/security regression test suite.
# Runs production privacy verification, frontend anti-screenshot tests,
# and optionally backend status tests (with --e2e flag).
#
# Usage:
#   bash scripts/privacy-regression.sh
#   bash scripts/privacy-regression.sh --e2e

set -e

E2E_MODE=false
if [ "$1" = "--e2e" ]; then
  E2E_MODE=true
fi

echo "=========================================="
echo "Privacy Regression Test Suite"
echo "=========================================="
echo ""

FAILED=0

# 1. Production Privacy Verification
echo "[1/3] Running production privacy verification..."
if node scripts/verify-production-privacy.js; then
  echo "✅ Production privacy verification passed"
else
  echo "❌ Production privacy verification FAILED"
  FAILED=$((FAILED + 1))
fi
echo ""

# 2. Frontend Anti-Screenshot Tests
echo "[2/3] Running frontend anti-screenshot tests..."
if npm --prefix frontend test -- src/tests/antiScreenshot.test.js; then
  echo "✅ Frontend anti-screenshot tests passed"
else
  echo "❌ Frontend anti-screenshot tests FAILED"
  FAILED=$((FAILED + 1))
fi
echo ""

# 3. Backend Status Tests (E2E mode only)
if [ "$E2E_MODE" = true ]; then
  echo "[3/3] Running backend status tests (E2E mode)..."
  if npm --prefix backend test -- status; then
    echo "✅ Backend status tests passed"
  else
    echo "❌ Backend status tests FAILED"
    FAILED=$((FAILED + 1))
  fi
  echo ""
else
  echo "[3/3] Skipping backend status tests (use --e2e to enable)"
  echo ""
fi

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ All privacy regression tests PASSED"
  exit 0
else
  echo "❌ $FAILED test suite(s) FAILED"
  exit 1
fi
