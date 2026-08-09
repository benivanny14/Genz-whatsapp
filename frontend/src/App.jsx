import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import InAppNotification from './components/InAppNotification';
import OfflineBanner from './components/OfflineBanner';
import InstallAppPrompt from './components/InstallAppPrompt';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import MobileBottomNav from './components/MobileBottomNav';
import { AdminAuthProvider } from './context/AdminAuthContext';
import notificationService from './services/notificationService';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from './utils/sanitizeStorage';
import { applyAntiScreenshot, initAntiScreenshotListeners } from './utils/antiScreenshot';
import toast, { Toaster } from 'react-hot-toast';
import { useChat } from './context/ChatContext';
import { useUser } from './context/UserContext';
import { getSocket } from './services/socket';
import { shouldShowCallScreen } from './utils/callUi';

// Lazy load pages for performance optimization
const Chat = lazy(() => import('./pages/Chat'));
const Settings = lazy(() => import('./pages/Settings'));
const NewChat = lazy(() => import('./pages/NewChat'));
const NewGroup = lazy(() => import('./pages/NewGroup'));
const Status = lazy(() => import('./pages/Status'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Starred = lazy(() => import('./pages/Starred'));
const Archived = lazy(() => import('./pages/Archived'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
const GENZMods = lazy(() => import('./pages/GENZMods'));
const FeatureLibrary = lazy(() => import('./pages/FeatureLibrary'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyPhone = lazy(() => import('./pages/VerifyPhone'));
const LinkedDevices = lazy(() => import('./pages/LinkedDevices'));
const PairDevice = lazy(() => import('./pages/PairDevice'));
const Broadcasts = lazy(() => import('./pages/Broadcasts'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));
const Channels = lazy(() => import('./pages/Channels'));
const ChannelView = lazy(() => import('./pages/ChannelView'));
const Communities = lazy(() => import('./pages/Communities'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const CallScreen = lazy(() => import('./components/CallScreen'));
const GroupCallScreen = lazy(() => import('./components/GroupCallScreen'));
const SubscriptionPayment = lazy(() => import('./components/PaidFeatures/SubscriptionPayment'));
const GenzAfterWork = lazy(() => import('./components/PaidFeatures/GenzAfterWork'));
const AdminPaymentManagement = lazy(() => import('./pages/AdminPaymentManagement'));

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
  const { activeCall, endCall, acceptCall, rejectCall, activeGroupCall, setActiveGroupCall, setActiveCall } = useChat();
  const { user } = useUser();

  const setDynamicAppIcon = useCallback(async (profilePicture) => {
    const fallbackIcon = '/icons/favicon-32x32.png';
    const fallbackAppleIcon = '/icons/apple-touch-icon.png';

    const updateIcon = (selector, href) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('href', href);
    };

    if (!profilePicture) {
      updateIcon('link[rel="icon"]', fallbackIcon);
      updateIcon('link[rel="apple-touch-icon"]', fallbackAppleIcon);
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = profilePicture;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 192, 192);
        const dataUrl = canvas.toDataURL('image/png');
        updateIcon('link[rel="icon"]', dataUrl);
        updateIcon('link[rel="apple-touch-icon"]', dataUrl);
      }
    } catch {
      updateIcon('link[rel="icon"]', fallbackIcon);
      updateIcon('link[rel="apple-touch-icon"]', fallbackAppleIcon);
    }
  }, []);

  useEffect(() => {
    setDynamicAppIcon(user?.profilePicture || user?.avatar || '').catch(() => {});
  }, [setDynamicAppIcon, user?.profilePicture, user?.avatar]);

  // --- Handle incoming calls from URL (when app is opened from notification) ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const callParam = urlParams.get('call');
    if (callParam) {
      try {
        const callData = JSON.parse(decodeURIComponent(callParam));
        console.log('[App] Incoming call from URL:', callData);
        setActiveCall(callData);
        // Clean URL to prevent re-processing
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('[App] Failed to parse call data from URL:', err);
      }
    }
  }, [setActiveCall]);

  // Real viewport height tracking (fixes the mobile keyboard black-bar bug)
  // is already initialized once in main.jsx, before React even mounts, and
  // its listeners live for the whole app lifetime. Initializing it again
  // here used to register a second, duplicate set of resize/scroll/
  // orientationchange listeners doing the exact same DOM writes on every
  // viewport event — wasted work that showed up as jank/instability on
  // mobile, especially with the keyboard opening/closing repeatedly.

  // --- Glass Mode & Video Background Sync ---
  useEffect(() => {
    const syncGlassMode = () => {
      try {
        const mods = readStoredMods();
        const root = document.documentElement;
        if (mods.glassMode) {
          root.classList.add('glass-mode-active');
        } else {
          root.classList.remove('glass-mode-active');
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
    const poll = setInterval(syncGlassMode, 8000);
    return () => {
      window.removeEventListener('storage', syncGlassMode);
      window.removeEventListener('genz-mods-updated', syncGlassMode);
      clearInterval(poll);
    };
  }, []);

  // --- Notifications ---
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const permission = await notificationService.requestNotificationPermission();
      const registration = await notificationService.registerServiceWorker();
      if (cancelled) return;

      notificationService.setupBackgroundNotificationHandler();

      // BUG FIX: this used to never run on first load — the app only ever
      // subscribed to Web Push inside ChatContext's socket 'reconnect'
      // handler, which most sessions never trigger. Without a push
      // subscription the OS/browser has nothing to show when the tab/app is
      // closed, so calls (and messages) only ever appeared while the app
      // was open in the foreground. Subscribing here, right after the
      // service worker is ready, is what actually enables background/locked
      // -screen notifications, including incoming calls.
      if (permission === 'granted' && registration) {
        notificationService.subscribeToWebPush(registration).catch(() => {});
      }
    })();

    // Handle messages posted from the service worker (background push clicks)
    const handleServiceWorkerMessage = (event) => {
      const data = event.data || {};

      // BUG FIX: this used to just console.log and do nothing, so tapping
      // "Answer" on a background call notification (with the app already
      // open in another tab/window) never actually opened the call screen.
      if (data.type === 'INCOMING_CALL' && data.call) {
        setActiveCall(data.call);
        return;
      }

      // BUG FIX: was never handled at all — declining a call from the
      // notification's "Decline" action silently did nothing, so the
      // caller's phone kept ringing even after the callee declined.
      if (data.type === 'CALL_DECLINE') {
        try {
          const socket = getSocket();
          if (socket && data.conversationId) {
            socket.emit('call:reject', {
              conversationId: data.conversationId,
              callerId: data.callerId,
            });
          }
        } catch (_) { /* ignore */ }
        setActiveCall((prev) => (
          prev && String(prev.conversationId) === String(data.conversationId) ? null : prev
        ));
        return;
      }

      // BUG FIX: was never handled — tapping a message notification opened
      // the app but never navigated to the actual conversation.
      if (data.type === 'OPEN_CHAT' && data.conversationId) {
        try {
          // ChatContext already listens for this exact event name to select
          // a conversation — it just was never dispatched from here.
          window.dispatchEvent(new CustomEvent('open-chat', {
            detail: { conversationId: data.conversationId },
          }));
        } catch (_) { /* ignore */ }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // BUG FIX: In-app notification toast (InAppNotification) used to receive
    // `notification` = null forever — nothing ever called setNotification()
    // with real data, so the toast was dead. ChatContext now dispatches a
    // `genz-in-app-notification` CustomEvent for foreground new-messages;
    // wire it to the toast here so the component actually shows.
    const handleInAppNotification = (event) => {
      const data = event?.detail;
      if (data && data.title) {
        setNotification({ title: data.title, message: data.message || '', avatar: data.avatar });
      }
    };
    window.addEventListener('genz-in-app-notification', handleInAppNotification);

    return () => {
      cancelled = true;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener('genz-in-app-notification', handleInAppNotification);
    };
  }, [setActiveCall, setNotification]);

  // --- PWA Updates ---
  useEffect(() => {
    const handleUpdate = () => {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-sm">Update available!</span>
            <span className="text-xs text-gray-400">A new version of GENZ is ready.</span>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-full"
              >
                Reload Now
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs w-full"
              >
                Later
              </button>
            </div>
          </div>
        ),
        { duration: Infinity, position: 'bottom-right', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }
      );
    };
    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  return (
    <ErrorBoundary>
      <div className="genz-grain" aria-hidden="true" />
      {/* Global toast host — without <Toaster /> every toast.success()/
          toast.error() call across the app is a silent no-op. Styled to
          match native APK toasts: dark WhatsApp surface, rounded, icon-tinted. */}
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 16, zIndex: 99999 }}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#202c33',
            color: '#e9edef',
            borderRadius: '14px',
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
            maxWidth: 'min(92vw, 380px)',
          },
          success: {
            iconTheme: { primary: '#25d366', secondary: '#0b141a' },
          },
          error: {
            iconTheme: { primary: '#ff6b6b', secondary: '#0b141a' },
            duration: 5000,
          },
          loading: {
            iconTheme: { primary: '#00a884', secondary: '#0b141a' },
          },
        }}
      />
      <OfflineBanner />
      <InstallAppPrompt />
      <InAppNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />
      <AdminAuthProvider>
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
            <Route path="/pair-device" element={<PairDevice />} />
            <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
            <Route path="/starred" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
            <Route path="/archived" element={<ProtectedRoute><Archived /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/manual-payments" element={<AdminProtectedRoute><AdminPaymentManagement /></AdminProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><SubscriptionPayment /></ProtectedRoute>} />
            <Route path="/genz-after-work" element={<ProtectedRoute><GenzAfterWork /></ProtectedRoute>} />
            <Route path="/admin-setup" element={<AdminProtectedRoute><AdminSetup /></AdminProtectedRoute>} />
            <Route path="/system-control-x7k9" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/system-control-x7k9/login" element={<AdminLogin />} />
            <Route path="/system-gateway-x9k" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/system-gateway-x9k/login" element={<AdminLogin />} />
            <Route path="/genz-mods" element={<ProtectedRoute><GENZMods /></ProtectedRoute>} />
            <Route path="/features" element={<ProtectedRoute><FeatureLibrary /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
            <Route path="/channels/:channelId" element={<ProtectedRoute><ChannelView /></ProtectedRoute>} />
            <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
            <Route path="/join/:groupId/:code" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </AdminAuthProvider>
      {/* Global Call Screen - shows incoming/active calls across all pages.
          CallScreen owns the full incoming->connected lifecycle itself (see
          utils/callUi.js for why IncomingCallPopup was removed from here). */}
      {shouldShowCallScreen(activeCall) && (
        <Suspense fallback={<PageLoader />}>
          <CallScreen 
            call={activeCall} 
            onEndCall={endCall} 
            onAcceptCall={acceptCall} 
            onRejectCall={rejectCall} 
          />
        </Suspense>
      )}
      {/* Global Group Call Screen */}
      {activeGroupCall && ['calling', 'incoming', 'connected'].includes(activeGroupCall.status) && (
        <Suspense fallback={<PageLoader />}>
          <GroupCallScreen 
            call={activeGroupCall} 
            onEnd={() => setActiveGroupCall(null)} 
            currentUser={user}
          />
        </Suspense>
      )}
      <MobileBottomNav />
    </ErrorBoundary>
  );
}

export default App;
