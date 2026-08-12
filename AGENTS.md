# AGENTS.md - Project Commands & Information

## Frontend (frontend/)
- **Build**: `npm run build` - Uses Vite for production builds (must pass)
- **Dev**: `npm run dev` - Starts Vite dev server at http://localhost:5174
- **Tests**: `npm test` (node:test, `src/tests/*.test.js`) — currently 71/71 passing
- **JSX import check**: `npm run check:jsx` — fails on JSX tags used without an import (missing lucide icons etc.)
- **E2E**: `npm run test:e2e` (Playwright, `frontend/e2e/`) — requires `GENZ_DEV_PORT=5176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176`
- **Mobile e2e**: `e2e/mobile-layout.spec.js` sweeps every Feature Library item on iPhone + Pixel viewports, asserting no React crash and no horizontal overflow (plus the admin dashboard). Requires MONGODB_URI/MONGO_URI pointing at an isolated e2e DB.
- **Lint**: No lint script configured (use Vite build for errors)

## Backend (backend/)
- **Start**: `node server.js` - Starts Express server
- **Syntax check**: `npm run check` (`node scripts/check-syntax.js`, 320 files)
- **Route-export check**: `npm run check:exports` (`node scripts/verify-route-exports.js`)
- **Tests**: `npm test` (jest) — currently 1613 passed / 3 skipped
- **Coverage**: `npm run coverage` / `npm run coverage:scan`

## Verification Commands
Always run these after making changes:
1. Frontend build: `cd frontend && npm run build`
2. Frontend JSX import check: `cd frontend && npm run check:jsx`
3. Backend syntax check: `cd backend && npm run check`
4. Backend route-export check: `cd backend && npm run check:exports`
5. Tests: `cd backend && npm test` and `cd frontend && npm test`
