#!/usr/bin/env node
/**
 * serve-production.js — Lightweight production server for the frontend.
 *
 * Replaces `vite preview` on Render so we can set correct Content-Type
 * headers for .apk downloads (vite preview / sirv doesn't recognise them).
 *
 * Usage:
 *   node scripts/serve-production.js          # default port 80
 *   PORT=3000 node scripts/serve-production.js
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

const PORT = parseInt(process.env.PORT || '80', 10);

// Extra MIME types that Node's built-in (mime-db) doesn't cover well.
const MIME_OVERRIDES = {
  '.apk': 'application/vnd.android.package-archive',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (MIME_OVERRIDES[ext]) return MIME_OVERRIDES[ext];
  // Fall back to a minimal extension map
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.wasm': 'application/wasm',
    '.map': 'application/json; charset=utf-8',
  };
  return map[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  // Only handle GET/HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method Not Allowed');
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Prevent directory traversal
  if (pathname.includes('..')) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // Try to serve from dist first, then public/ (for APK which apk:build
  // removes from dist but keeps in public/)
  const publicDir = path.resolve(__dirname, '..', 'public');
  let filePath = path.join(distDir, pathname);

  // If it's a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If not in dist, try public/ (handles APK after apk:build strips dist)
  if (!fs.existsSync(filePath)) {
    const publicPath = path.join(publicDir, pathname);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      filePath = publicPath;
    }
  }

  // If file doesn't exist, serve SPA fallback (index.html)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  try {
    const stat = fs.statSync(filePath);
    const mime = getMime(filePath);

    // Set headers
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);

    // Cache static assets aggressively, but not HTML
    if (mime === 'text/html; charset=utf-8') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Special headers for APK downloads
    if (filePath.endsWith('.apk')) {
      res.setHeader('Content-Disposition', 'attachment; filename="genz-whatsapp.apk"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    // Stream the file
    if (req.method === 'HEAD') {
      res.writeHead(200);
      return res.end();
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  } catch (err) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[serve-production] Frontend serving on http://0.0.0.0:${PORT}`);
  console.log(`[serve-production] Dist dir: ${distDir}`);
  console.log(`[serve-production] APK Content-Type: application/vnd.android.package-archive`);
});
