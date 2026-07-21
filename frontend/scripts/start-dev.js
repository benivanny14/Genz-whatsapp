#!/usr/bin/env node

// Development startup (ESM): cleanup, start backend, then start Vite.

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const backendDir = path.resolve(rootDir, '..', 'backend');
const backendHealthUrl = 'http://127.0.0.1:5000/api/health';
let backendServer = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortInUse = (port) => {
  try {
    execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const checkBackendHealth = () =>
  new Promise((resolve) => {
    const req = http.get(backendHealthUrl, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });

const waitForBackend = async (timeoutMs = 60000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await checkBackendHealth()) {
      return true;
    }

    await sleep(1000);
  }

  return false;
};

const shutdown = (devServer) => {
  console.log('\nShutting down development servers...');
  if (devServer) devServer.kill('SIGINT');
  if (backendServer) backendServer.kill('SIGINT');
  process.exit(0);
};

console.log('Starting GENZ WhatsApp Development Environment...\n');

// 1. Optional port checks.
console.log('Checking for existing processes...');
try {
  if (isPortInUse(5173)) {
    console.log('Port 5173 is in use.');
  }

  const viteCfg = fs.readFileSync(path.join(rootDir, 'vite.config.js'), 'utf8');
  const portMatch = viteCfg.match(/port:\s*(\d+)/);
  const vitePort = portMatch ? portMatch[1] : '5175';

  if (isPortInUse(vitePort)) {
    console.log(`Port ${vitePort} is in use. If Vite fails to bind, free the port or change vite.config.js.`);
  }

  console.log('Port check complete.');
} catch {
  console.log('Could not check ports. Continuing...');
}

// 2. Clear Vite cache.
console.log('Clearing development caches...');
const cacheDir = path.join(rootDir, 'node_modules/.vite');
if (fs.existsSync(cacheDir)) {
  try {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('Vite cache cleared.');
  } catch {
    console.log('Could not clear Vite cache.');
  }
}

// 3. Run cleanup script (ESM side effects).
console.log('Running environment cleanup...');
try {
  await import('./cleanup-dev.js');
} catch (error) {
  console.log('Cleanup script failed:', error.message);
}

// 4. Start backend automatically so API and Socket.IO calls do not fail.
console.log('\nStarting backend server...');
if (isPortInUse(5000)) {
  console.log('Backend port 5000 is already in use. Reusing existing backend.');
} else {
  backendServer = spawn(process.execPath, ['server.js'], {
    stdio: 'inherit',
    cwd: backendDir,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  backendServer.on('error', (error) => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });

  backendServer.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.error(`Backend exited with code ${code}`);
    }
  });
}

if (!(await waitForBackend())) {
  console.error('Backend did not become ready on http://localhost:5000.');
  if (backendServer) backendServer.kill('SIGTERM');
  process.exit(1);
}

console.log('Backend ready: http://localhost:5000');

// 5. Start Vite directly (avoid `npm run dev` -> recursion).
console.log('\nStarting Vite dev server...');
console.log('Backend:  http://localhost:5000');
console.log('Socket.IO: ws://localhost:5000\n');

const viteCli = path.join(rootDir, 'node_modules/vite/bin/vite.js');
const devServer = spawn(process.execPath, [viteCli], {
  stdio: 'inherit',
  cwd: rootDir,
  env: { ...process.env, FORCE_COLOR: '1' }
});

devServer.on('error', (error) => {
  console.error('Failed to start Vite:', error.message);
  if (backendServer) backendServer.kill('SIGTERM');
  process.exit(1);
});

devServer.on('close', (code) => {
  console.log(`\nVite exited with code ${code}`);
  if (backendServer) backendServer.kill('SIGTERM');
  process.exit(code ?? 0);
});

process.on('SIGINT', () => shutdown(devServer));
process.on('SIGTERM', () => shutdown(devServer));
