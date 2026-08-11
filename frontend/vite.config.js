import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend the dev proxy forwards /api, /uploads and /socket.io to.
// Overridable per-worktree (e.g. GENZ_BACKEND_TARGET=http://localhost:5055)
// so a preview can run against a newer backend without editing this file.
const backendTarget = process.env.GENZ_BACKEND_TARGET || 'http://localhost:5000';

// Port the dev server listens on (and advertises for HMR). Defaults to 5174;
// override per worktree (e.g. GENZ_DEV_PORT=5176) so a preview or the e2e
// suite can run on another port without breaking the HMR WebSocket.
const devPort = parseInt(process.env.GENZ_DEV_PORT || '5174', 10) || 5174;

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            return 'vendor';
          }
          if (id.includes('/components/ChatArea')) return 'chat-area';
        }
      }
    },
    chunkSizeWarningLimit: 600
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
