#!/usr/bin/env node

// Single-origin development run: builds the frontend, then boots ONLY the
// backend, which serves the built UI, the API and Socket.IO from one origin
// (http://localhost:5000) — the same layout production and the e2e suite use.
//
// Use this when you want to verify the production serving path locally.
// `npm run dev` (Vite HMR + dev proxy) remains the default workflow — the
// proxy is what keeps HMR fast during active development, so it is not removed.

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const backendDir = path.resolve(rootDir, '..', 'backend');

console.log('Building frontend for single-origin serving...');
const build = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  stdio: 'inherit',
  cwd: rootDir
});

build.on('close', (code) => {
  if (code !== 0) {
    console.error(`Build failed with code ${code}`);
    process.exit(code ?? 1);
  }

  console.log('\nStarting backend — serves UI, API and Socket.IO on one origin:');
  console.log('  http://localhost:5000\n');
  const backend = spawn(process.execPath, ['server.js'], {
    stdio: 'inherit',
    cwd: backendDir,
    env: { ...process.env }
  });

  backend.on('close', (exitCode) => process.exit(exitCode ?? 0));
  process.on('SIGINT', () => backend.kill('SIGINT'));
  process.on('SIGTERM', () => backend.kill('SIGTERM'));
});
