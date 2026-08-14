import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'

// The version this bundle was BUILT with, baked in from public/version.json
// (written by bump-app-version.js / build-apk.js). UpdateBanner uses it on the
// web: when the served /version.json reports a newer versionCode than the
// bundle's own, the app is running a stale build and offers a Reload. Falls
// back to 0.0.0/0 if version.json is somehow absent at build time.
let bundleVersion = '0.0.0'
let bundleVersionCode = 0
try {
  const v = JSON.parse(readFileSync(new URL('./public/version.json', import.meta.url), 'utf8'))
  bundleVersion = v.version || bundleVersion
  bundleVersionCode = Number(v.versionCode) || 0
} catch {
  // version.json missing — fallbacks above keep the build safe
}

// Backend the dev proxy forwards /api, /uploads and /socket.io to.
// Overridable per-worktree (e.g. GENZ_BACKEND_TARGET=http://localhost:5055)
// so a preview can run against a newer backend without editing this file.
const backendTarget = process.env.GENZ_BACKEND_TARGET || 'http://localhost:5000';

// Port the dev server listens on (and advertises for HMR). Defaults to 5174;
// override per worktree (e.g. GENZ_DEV_PORT=5176) so a preview or the e2e
// suite can run on another port without breaking the HMR WebSocket.
const devPort = parseInt(process.env.GENZ_DEV_PORT || '5174', 10) || 5174;

// Native FCM push is only safe to call when the Android project has a
// google-services.json (Firebase). Without it, PushNotifications.register()
// throws IllegalStateException on the native side and crashes the app on
// login. This flag tells capacitorBridge whether it may touch Firebase.
const fcmConfigured = existsSync(new URL('./android/app/google-services.json', import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    // Injected bundle version (see above) — used by UpdateBanner to detect a
    // stale web build without a native versionCode.
    __GENZ_VERSION__: JSON.stringify(bundleVersion),
    __GENZ_VERSION_CODE__: JSON.stringify(bundleVersionCode),
    // True only when google-services.json is present at build time — native
    // push registration must never run without it.
    __GENZ_FCM_ENABLED__: JSON.stringify(fcmConfigured),
  },
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (rolldown): manualChunks is deprecated — use advancedChunks
        // groups. Split vendor libs for caching and the chat subtree into
        // separately-cached chunks so one panel change doesn't invalidate the
        // whole chat bundle.
        advancedChunks: {
          groups: [
            { name: 'vendor-motion', test: /framer-motion/ },
            { name: 'vendor-icons', test: /lucide-react/ },
            { name: 'vendor-socket', test: /socket\.io-client/ },
            { name: 'vendor-react', test: /react-dom|react-router/ },
            { name: 'vendor-maps', test: /leaflet/ },
            { name: 'vendor', test: /node_modules/ },
            { name: 'chat-modals', test: /components\/ChatModals/ },
            { name: 'chat-bubbles', test: /components\/MessageBubbleList/ },
            { name: 'chat-composer', test: /components\/MessageComposer/ },
            { name: 'chat-header', test: /components\/ConversationHeader/ },
            { name: 'chat-list', test: /components\/MessageListArea/ },
            { name: 'chat-area', test: /components\/ChatArea/ }
          ]
        }
      }
    },
    // FeatureLibrary (optional page) is 693 kB raw / ~104 kB gzip — it
    // statically imports dozens of feature components, so it stays a single
    // page chunk; the limit is raised past it so only genuinely oversized
    // bundles warn.
    chunkSizeWarningLimit: 750
  },
  server: {
    port: devPort,
    strictPort: true,
    host: '0.0.0.0',
    hmr: {
      clientPort: devPort
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  preview: {
    allowedHosts: ['genz-whatsapp-1.onrender.com', 'localhost', '127.0.0.1']
  }
})
