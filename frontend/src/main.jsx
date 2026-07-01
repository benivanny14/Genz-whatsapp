import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { UserProvider } from './context/UserContext'
import { ChatProvider } from './context/ChatContext'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { cleanupLocalBlobUrls } from './utils/sanitizeStorage'

cleanupLocalBlobUrls();

const ENABLE_DEV_SERVICE_WORKER = import.meta.env.VITE_ENABLE_DEV_SERVICE_WORKER === 'true';
const shouldRegisterServiceWorker = import.meta.env.PROD || ENABLE_DEV_SERVICE_WORKER;

const cleanupDevServiceWorkers = async () => {
  if (!('serviceWorker' in navigator) || import.meta.env.PROD || ENABLE_DEV_SERVICE_WORKER) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (registrations.length) {
      console.log(`[SW] Removed ${registrations.length} development registration(s)`);
    }
  } catch (error) {
    console.warn('[SW] Development cleanup failed:', error);
  }
};

// Apply saved custom font on startup
try {
  const mods = JSON.parse(localStorage.getItem('genz_mods') || '{}');
  const fontMap = {
    serif: "'Georgia', serif",
    mono: "'Courier New', monospace",
    rounded: "'Trebuchet MS', sans-serif",
    elegant: "'Palatino', serif",
    bold: "'Arial Black', sans-serif",
  };
  if (mods.customFont && fontMap[mods.customFont]) {
    document.body.style.fontFamily = fontMap[mods.customFont];
  }
} catch (_) {}

// ── Service Worker + Push Notification Registration ───────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (!shouldRegisterServiceWorker) {
      await cleanupDevServiceWorkers();
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      console.log('[SW] Registered:', registration.scope);

      // When a new SW version activates and takes control, reload once so
      // this tab picks up the fresh app shell + asset hashes instead of
      // continuing to run on a stale bundle (which breaks lazy-loaded routes).
      let hasReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      });

      // Handle SW messages (open chat from notification click)
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, conversationId } = event.data || {};
        if (type === 'OPEN_CHAT' && conversationId) {
          window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId } }));
        }
        if (type === 'CALL_DECLINE') {
          window.dispatchEvent(new CustomEvent('call-decline', { detail: event.data }));
        }
        if (type === 'SYNC_MESSAGES') {
          window.dispatchEvent(new CustomEvent('sync-messages'));
        }
      });

      // Request push notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('[Notifications] Permission:', permission);
      }

    } catch (error) {
      console.warn('[SW] Registration failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <LanguageProvider>
          <UserProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </UserProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
)
