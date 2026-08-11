# AGENTS.md - Project Commands & Information

## Frontend (frontend/)
- **Build**: `npm run build` - Uses Vite for production builds (must pass)
- **Dev**: `npm run dev` - Starts Vite dev server at http://localhost:5174
- **Tests**: `npm test` (node:test, `src/tests/*.test.js`) — currently 71/71 passing
- **E2E**: `npm run test:e2e` (Playwright, `frontend/e2e/`) — requires `GENZ_DEV_PORT=5176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176`
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
2. Backend syntax check: `cd backend && npm run check`
3. Backend route-export check: `cd backend && npm run check:exports`
4. Tests: `cd backend && npm test` and `cd frontend && npm test`
