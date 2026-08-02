# AGENTS.md - Project Commands & Information

## Frontend (frontend/)
- **Build**: `npm run build` - Uses Vite for production builds
- **Dev**: `npm run dev` - Starts Vite dev server at http://localhost:5173
- **Lint**: No lint script configured (use ESLint via Vite build for errors)

## Backend (backend/)
- **Start**: `node server.js` - Starts Express server
- **Syntax check**: `node -c server.js`
- **Routes test**: `node -e "require('./routes/route-name')"` to verify routes load
- **Tests**: `npm test` or `npm run test:unit`

## Verification Commands
Always run these after making changes:
1. Frontend build: `cd frontend && npm run build`
2. Backend syntax check: `cd backend && node -c server.js`
