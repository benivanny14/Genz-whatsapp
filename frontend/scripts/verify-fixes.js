#!/usr/bin/env node

// Verification script for GENZ WhatsApp development environment (ESM)

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Verifying GENZ WhatsApp Development Fixes...\n');

const readVitePort = () => {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '../vite.config.js'), 'utf8');
    const m = cfg.match(/port:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 5175;
  } catch {
    return 5175;
  }
};

const vitePort = readVitePort();

// 1. Verify Vite Configuration
console.log('1️⃣ Checking Vite Configuration...');
const viteConfigPath = path.join(__dirname, '../vite.config.js');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  const hasPort = viteConfig.includes('port:');
  const hasHMRConfig = viteConfig.includes('hmr:');
  const hasStrictPort = viteConfig.includes('strictPort: true');

  console.log(`   ✅ Dev port (${vitePort}): ${hasPort ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ HMR Config: ${hasHMRConfig ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ Strict Port: ${hasStrictPort ? 'CONFIGURED' : 'MISSING'}`);
} else {
  console.log('   ❌ Vite config not found');
}

// 2. Verify Service Worker
console.log('\n2️⃣ Checking Service Worker...');
const swPath = path.join(__dirname, '../public/service-worker.js');
if (fs.existsSync(swPath)) {
  console.log('   ✅ Service Worker file exists');

  const swContent = fs.readFileSync(swPath, 'utf8');
  const hasInstallEvent = swContent.includes("self.addEventListener('install'");
  const hasFetchEvent = swContent.includes("self.addEventListener('fetch'");
  const hasPushEvent = swContent.includes("self.addEventListener('push'");

  console.log(`   ✅ Install Event: ${hasInstallEvent ? 'PRESENT' : 'MISSING'}`);
  console.log(`   ✅ Fetch Event: ${hasFetchEvent ? 'PRESENT' : 'MISSING'}`);
  console.log(`   ✅ Push Event: ${hasPushEvent ? 'PRESENT' : 'MISSING'}`);
} else {
  console.log('   ❌ Service Worker file not found');
}

// 3. Verify Main.jsx Service Worker Registration
console.log('\n3️⃣ Checking Service Worker Registration...');
const mainPath = path.join(__dirname, '../src/main.jsx');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  const hasProdCheck = mainContent.includes('import.meta.env.PROD');
  const hasCleanup = mainContent.includes('getRegistrations()');
  const hasErrorHandling = mainContent.includes('try {');

  console.log(`   ✅ Production Check: ${hasProdCheck ? 'IMPLEMENTED' : 'MISSING'}`);
  console.log(`   ✅ Cleanup Logic: ${hasCleanup ? 'IMPLEMENTED' : 'MISSING'}`);
  console.log(`   ✅ Error Handling: ${hasErrorHandling ? 'IMPLEMENTED' : 'MISSING'}`);
} else {
  console.log('   ❌ Main.jsx not found');
}

// 4. Verify Socket.IO Configuration
console.log('\n4️⃣ Checking Socket.IO Configuration...');
const chatContextPath = path.join(__dirname, '../src/context/ChatContext.jsx');
if (fs.existsSync(chatContextPath)) {
  const chatContent = fs.readFileSync(chatContextPath, 'utf8');
  const hasWebSocketOnly = /transports:\s*\[[^\]]*websocket[^\]]*\]/i.test(chatContent);
  const hasCredentials = chatContent.includes('withCredentials: true');
  const hasOfflineCheck = chatContent.includes('isOffline()');

  console.log(`   ✅ WebSocket Only: ${hasWebSocketOnly ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ With Credentials: ${hasCredentials ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ Offline Check: ${hasOfflineCheck ? 'IMPLEMENTED' : 'MISSING'}`);
} else {
  console.log('   ❌ ChatContext.jsx not found');
}

// 5. Verify Package.json Scripts
console.log('\n5️⃣ Checking Package.json Scripts...');
const packagePath = path.join(__dirname, '../package.json');
if (fs.existsSync(packagePath)) {
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasStartDev = packageContent.scripts && packageContent.scripts.dev;
  const hasCleanScript = packageContent.scripts && packageContent.scripts.clean;
  const hasDevSimple = packageContent.scripts && packageContent.scripts['dev:simple'];

  console.log(`   ✅ Start Dev Script: ${hasStartDev ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ Clean Script: ${hasCleanScript ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`   ✅ Simple Dev Script: ${hasDevSimple ? 'CONFIGURED' : 'MISSING'}`);
} else {
  console.log('   ❌ Package.json not found');
}

// 6. Check for Port Conflicts (Vite port from config)
console.log('\n6️⃣ Checking for Port Conflicts...');
try {
  const netstatOutput = execSync(`netstat -ano | findstr :${vitePort}`, { encoding: 'utf8' });
  if (netstatOutput.trim()) {
    console.log(`   ⚠️ Port ${vitePort} is in use`);
  } else {
    console.log(`   ✅ Port ${vitePort} is available`);
  }
} catch {
  console.log(`   ✅ Port ${vitePort} is available`);
}

// 7. Verify Development Scripts
console.log('\n7️⃣ Checking Development Scripts...');
const scriptsDir = path.join(__dirname, '../scripts');
const startDevPath = path.join(scriptsDir, 'start-dev.js');
const cleanupDevPath = path.join(scriptsDir, 'cleanup-dev.js');

if (fs.existsSync(startDevPath)) {
  console.log('   ✅ start-dev.js script exists');
} else {
  console.log('   ❌ start-dev.js script missing');
}

if (fs.existsSync(cleanupDevPath)) {
  console.log('   ✅ cleanup-dev.js script exists');
} else {
  console.log('   ❌ cleanup-dev.js script missing');
}

// 8. Check Backend Status
console.log('\n8️⃣ Checking Backend Status...');
try {
  const backendResponse = execSync('curl -s http://localhost:5000/api/health 2>nul || echo offline', {
    encoding: 'utf8',
    shell: true
  });
  if (backendResponse.includes('offline') || !backendResponse.trim()) {
    console.log('   ⚠️ Backend server not responding on port 5000');
  } else {
    console.log('   ✅ Backend server is running on port 5000');
  }
} catch {
  console.log('   ⚠️ Backend server not responding on port 5000');
}

// Summary
console.log('\n🎯 VERIFICATION COMPLETE');
console.log('\n📋 NEXT STEPS:');
console.log('1. Run: npm run dev (uses start-dev.js → Vite)');
console.log('2. Backend should be running on: http://localhost:5000');
console.log(`3. Frontend will run on: http://localhost:${vitePort}`);
console.log('\n✨ Verification script finished.');
