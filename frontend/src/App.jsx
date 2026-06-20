import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import InAppNotification from './components/InAppNotification';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import notificationService from './services/notificationService';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from './utils/sanitizeStorage';
import { applyAntiScreenshot, initAntiScreenshotListeners } from './utils/antiScreenshot';

// Lazy load pages for performance optimization
const Chat = lazy(() => import('./pages/Chat'));
const Settings = lazy(() => import('./pages/Settings'));
const NewChat = lazy(() => import('./pages/NewChat'));
const NewGroup = lazy(() => import('./pages/NewGroup'));
const Status = lazy(() => import('./pages/Status'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Starred = lazy(() => import('./pages/Starred'));
const Archived = lazy(() => import('./pages/Archived'));
const Calls = lazy(() => import('./pages/Calls'));
const Admin = lazy(() => import('./pages/Admin'));
const GENZMods = lazy(() => import('./pages/GENZMods'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const LinkedDevices = lazy(() => import('./pages/LinkedDevices'));
const Broadcasts = lazy(() => import('./pages/Broadcasts'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm font-semibold">Loading GENZ...</p>
    </div>
  </div>
);

const readStoredMods = () => {
  try {
    cleanupLocalBlobUrls();

    const legacyMods = JSON.parse(localStorage.getItem('genz_mods') || 'null');
    if (legacyMods && typeof legacyMods === 'object') {
      return sanitizeBlobUrls(legacyMods).value;
    }

    const settings = JSON.parse(localStorage.getItem('genz_settings_comprehensive') || 'null');
    return settings?.mods && typeof settings.mods === 'object'
      ? sanitizeBlobUrls(settings.mods).value
      : {};
  } catch {
    return {};
  }
};

function App() {
  const [notification, setNotification] = useState(null);

  // --- Glass Mode & Video Background Sync ---
  useEffect(() => {
    const syncGlassMode = () => {
      try {
        const mods = readStoredMods();
        const root = document.documentElement;
        if (mods.glassMode) {
          root.classList.add('glass-mode');
        } else {
          root.classList.remove('glass-mode');
        }
        // Sync video background
        let videoBg = document.getElementById('genz-video-bg');
        if (!videoBg) {
          videoBg = document.createElement('video');
          videoBg.id = 'genz-video-bg';
          videoBg.autoplay = true;
          videoBg.loop = true;
          videoBg.muted = true;
          videoBg.playsInline = true;
          videoBg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;display:none;';
          document.body.prepend(videoBg);
        }
        if (mods.glassMode && mods.videoBg && !mods.videoBg.startsWith('blob:')) {
          if (videoBg.src !== mods.videoBg) videoBg.src = mods.videoBg;
          videoBg.style.opacity = String(mods.videoBgOpacity ?? 0.4);
          videoBg.style.filter = `blur(${mods.videoBgBlur ?? 0}px)`;
          videoBg.style.display = 'block';
          videoBg.play().catch(() => {});
        } else {
          videoBg.removeAttribute('src');
          videoBg.load?.();
          videoBg.style.display = 'none';
        }
        initAntiScreenshotListeners();
        applyAntiScreenshot(mods.antiScreenshot);
      } catch { /* silent */ }
    };

    syncGlassMode();
    window.addEventListener('storage', syncGlassMode);
    window.addEventListener('genz-mods-updated', syncGlassMode);
    const poll = setInterval(syncGlassMode, 2000);
    return () => {
      window.removeEventListener('storage', syncGlassMode);
      window.removeEventListener('genz-mods-updated', syncGlassMode);
      clearInterval(poll);
    };
  }, []);

  // --- Notifications ---
  useEffect(() => {
    notificationService.requestNotificationPermission();
    notificationService.registerServiceWorker().then(() => {
      notificationService.setupBackgroundNotificationHandler();
    });
  }, []);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <InAppNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/new-chat" element={<ProtectedRoute><NewChat /></ProtectedRoute>} />
          <Route path="/new-group" element={<ProtectedRoute><NewGroup /></ProtectedRoute>} />
          <Route path="/status" element={<ProtectedRoute><Status /></ProtectedRoute>} />
          <Route path="/broadcast" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
          <Route path="/broadcast/simple" element={<ProtectedRoute><Broadcast /></ProtectedRoute>} />
          <Route path="/linked-devices" element={<ProtectedRoute><LinkedDevices /></ProtectedRoute>} />
          <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="/starred" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
          <Route path="/archived" element={<ProtectedRoute><Archived /></ProtectedRoute>} />
          <Route path="/calls" element={<ProtectedRoute><Calls /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/genz-mods" element={<ProtectedRoute><GENZMods /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
