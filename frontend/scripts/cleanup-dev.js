#!/usr/bin/env node

// Cleanup script for development environment
// Clears old service workers, caches, and ensures clean startup

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Cleaning up development environment...');

// 1. Ensure a valid PWA manifest exists — but NEVER overwrite the tracked
// production manifest (public/manifest.json ships maskable icons + install
// screenshots). Only create a minimal one when the file is absent so a fresh
// clone / build without it still gets a valid manifest.
const manifestPath = path.join(__dirname, '../public/manifest.json');
if (!fs.existsSync(manifestPath)) {
  const manifest = {
    name: 'Genz Messenger',
    short_name: 'GENZ',
    description: 'WhatsApp clone with GENZ Ultra features',
    start_url: '/',
    display: 'standalone',
    background_color: '#075E54',
    theme_color: '#128C7E',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Minimal manifest created (public/manifest.json was missing)');
} else {
  console.log('✅ Manifest exists — left untouched');
}

// 2. Ensure service worker is clean
const swPath = path.join(__dirname, '../public/service-worker.js');
if (fs.existsSync(swPath)) {
  console.log('📄 Service worker exists');
} else {
  console.log('⚠️ Service worker not found');
}

// 3. Create offline.html if it doesn't exist
const offlinePath = path.join(__dirname, '../public/offline.html');
if (!fs.existsSync(offlinePath)) {
  const offlineHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Genz Messenger - Offline</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f0f2f5;
            color: #4b5563;
        }
        .offline-container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 400px;
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>You're offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()">Retry</button>
    </div>
</body>
</html>`;
  fs.writeFileSync(offlinePath, offlineHtml);
  console.log('✅ Offline page created');
}

console.log('🎉 Development environment cleanup complete!');
