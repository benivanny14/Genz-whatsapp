import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useNativeBackButton } from './hooks/useNativeBackButton';
import ErrorBoundary from './components/ErrorBoundary';
import InAppNotification from './components/InAppNotification';
import OfflineBanner from './components/OfflineBanner';
import UpdateBanner from './components/UpdateBanner';
// ServerHealthBanner removed — health status visible on admin dashboard only
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import MobileBottomNav from './components/MobileBottomNav';
import DownloadApkFab from './components/DownloadApkFab';
import { AdminAuthProvider } from './context/AdminAuthContext';
import notificationService from './services/notificationService';
import { cleanupLocalBlobUrls, sanitizeBlobUrls } from './utils/sanitizeStorage';
import { applyAntiScreenshot, initAntiScreenshotListeners } from './utils/antiScreenshot';
import toast, { Toaster } from 'react-hot-toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import { PromptDialogProvider } from './components/PromptDialog';
import { useChat } from './context/ChatContext';
import { useUser } from './context/UserContext';
import { useAuth } from './context/AuthContext';
import { getSocket } from './services/socket';
import { authenticateWithBiometric } from './services/capacitorBridge';
import { initBackgroundSync } from './services/backgroundSync';
import { setStatusBar } from './utils/statusBarHelper';
import { PushNotifications } from '@capacitor/push-notifications';
import { trackUpdateEvent } from './utils/updateAnalytics';
import { initKeyboardShortcuts } from './utils/keyboardShortcuts';

// Lazy load pages for performance optimization
const Chat = lazy(() => import('./pages/Chat'));
const Settings = lazy(() => import('./pages/Settings'));
const NewChat = lazy(() => import('./pages/NewChat'));
const SharedStatus = lazy(() => import('./components/SharedStatus'));
const NewGroup = lazy(() => import('./pages/NewGroup'));
const Status = lazy(() => import('./pages/Status'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Starred = lazy(() => import('./pages/Starred'));
const Archived = lazy(() => import('./pages/Archived'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
// GENZ Mods removed - features moved to GENZ Settings
const FeatureLibrary = lazy(() => import('./pages/FeatureLibrary'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const InstallGuide = lazy(() => import('./pages/InstallGuide'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyPhone = lazy(() => import('./pages/VerifyPhone'));
const LinkedDevices = lazy(() => import('./pages/LinkedDevices'));
const PairDevice = lazy(() => import('./pages/PairDevice'));
const Broadcasts = lazy(() => import('./pages/Broadcasts'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));
const Communities = lazy(() => import('./pages/Communities'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const SubscriptionPayment = lazy(() => import('./components/PaidFeatures/SubscriptionPayment'));
const GenzAfterWork = lazy(() => import('./components/PaidFeatures/GenzAfterWork'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminPaymentManagement = lazy(() => import('./pages/AdminPaymentManagement'));
const Winga = lazy(() => import('./pages/Winga'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm font-semibold">Loading GENZ...</p>
    </div>
  </div>
);

const NativeAwareLanding = () => {
  const { isAuthenticated, loading } = useAuth();

  if (!Capacitor.isNativePlatform()) {
    return <LandingPage />;
  }

  if (loading) return <PageLoader />;

  return <Navigate to={isAuthenticated ? '/chat' : '/login'} replace />;
};

const readStoredMods = (userId) => {
  try {
    cleanupLocalBlobUrls();

    // ChatContext persists mods under USER-SCOPED keys
    // (genz_settings_comprehensive:<userId> / genz_mods:<userId>).
    if (userId) {
      const scoped = JSON.parse(localStorage.getItem(`genz_settings_comprehensive:${userId}`) || 'null');
      if (scoped?.mods && typeof scoped.mods === 'object') {
        return sanitizeBlobUrls(scoped.mods).value;
      }
      const scopedMods = JSON.parse(localStorage.getItem(`genz_mods:${userId}`) || 'null');
      if (scopedMods && typeof scopedMods === 'object') {
        return sanitizeBlobUrls(scopedMods).value;
      }
    }

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
  const { selectedConversation, selectConversation, user: chatUser } = useChat();
  const { user } = useUser();

  // Native Android back button (APK only): closes an open chat first, then
  // navigates back through history, then minimizes the app on the main
  // screen.
  useNativeBackButton({
    isConversationOpen: Boolean(selectedConversation),
    onCloseConversation: () => selectConversation(null),
    onExitRequest: () => CapacitorApp.minimizeApp(),
  });

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

  // Real viewport height tracking (fixes the mobile keyboard black-bar bug)
  // is already initialized once in main.jsx, before React even mounts, and
  // its listeners live for the whole app lifetime. Initializing it again
  // here used to register a second, duplicate set of resize/scroll/
  // orientationchange listeners doing the exact same DOM writes on every
  // viewport event — wasted work that showed up as jank/instability on
  // mobile, especially with the keyboard opening/closing repeatedly.

  // --- Push Notifications Registration (APK only) ---
  // Uses the capacitorBridge's initNativePush which properly checks
  // FCM_ENABLED before calling PushNotifications.register(). Without
  // google-services.json (Firebase), register() crashes the APK.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const { initNativePush } = require('./services/capacitorBridge');
    initNativePush().catch(() => {});
  }, []);

  // --- App lifecycle analytics ---
  useEffect(() => {
    trackUpdateEvent('app_open');
    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      trackUpdateEvent(isActive ? 'app_resume' : 'app_background');
    });
    return () => { stateListener?.then(l => l.remove()); };
  }, []);

  // --- Deep links (APK): open shared status URLs from scanned QR codes ---
  // Uses React Router navigate() instead of window.location.href to avoid
  // full page reloads that break app state and cause flash of white screen.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const openDeepLink = (url) => {
      try {
        const str = String(url || '');
        // Status deep link: /status/shared/<id> or /status/<id>
        const statusMatch = str.match(/\/status\/shared\/([A-Za-z0-9]+)/);
        if (statusMatch?.[1]) {
          window.dispatchEvent(new CustomEvent('deep-link', {
            detail: { path: `/status/shared/${statusMatch[1]}` }
          }));
          return;
        }
        const statusDirect = str.match(/\/status\/([A-Za-z0-9]+)/);
        if (statusDirect?.[1]) {
          window.dispatchEvent(new CustomEvent('deep-link', {
            detail: { path: `/status/${statusDirect[1]}` }
          }));
          return;
        }
        // Chat deep link: /chat/<id>
        const chatMatch = str.match(/\/chat\/([A-Za-z0-9]+)/);
        if (chatMatch?.[1]) {
          window.dispatchEvent(new CustomEvent('deep-link', {
            detail: { path: `/chat/${chatMatch[1]}` }
          }));
          return;
        }
      } catch (_) { /* ignore malformed deep links */ }
    };

    const listener = CapacitorApp.addListener('appUrlOpen', (data) => {
      openDeepLink(data?.url);
    });
    // Handle a URL that launched the app cold.
    CapacitorApp.getLaunchUrl?.().then((res) => openDeepLink(res?.url)).catch(() => {});
    return () => {
      listener?.then((l) => l.remove());
    };
  }, []);

  // --- Keyboard shortcuts (desktop/web only) ---
  const navigate = useNavigate();
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined;
    return initKeyboardShortcuts({
      onSearch: () => navigate('/chat'),
      onNewChat: () => navigate('/new-chat'),
      onSettings: () => navigate('/settings'),
      onCloseModal: () => window.dispatchEvent(new CustomEvent('close-all-modals')),
    });
  }, [navigate]);

  // --- Glass Mode & Video Background Sync ---
  useEffect(() => {
    const syncGlassMode = () => {
      try {
        const mods = readStoredMods(chatUser?._id || chatUser?.id);
        const root = document.documentElement;
        // PREMIUM CHECK: Only apply premium mods if user has active subscription
        const isPremiumActive = user?.premium && user?.subscriptionExpiresAt &&
          new Date() <= new Date(user.subscriptionExpiresAt);
        if (isPremiumActive && mods.glassMode) {
          root.classList.add('glass-mode-active');
        } else {
          root.classList.remove('glass-mode-active');
        }
        // Sync video background (premium only)
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
        // Frosted full-screen layer (blur + dark tint) between the video and
        // #root so text stays readable over the video on EVERY screen. It is
        // an empty fixed div — no descendants — so its backdrop-filter never
        // becomes a containing block for the app's fixed overlays. Inline
        // style so the CSS minifier can't strip the backdrop-filter. The
        // tint strength follows the user's Glass Opacity slider and the
        // blur follows the Blur Strength slider.
        let frostLayer = document.getElementById('genz-glass-frost');
        if (!frostLayer) {
          frostLayer = document.createElement('div');
          frostLayer.id = 'genz-glass-frost';
          frostLayer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none;';
          document.body.prepend(frostLayer);
        }
        const frostAlpha = Math.min(0.8, Math.max(0.3, 0.4 + ((mods.glassOpacity ?? 0.15) - 0.15) * 0.9));
        const frostBlur = Math.min(40, Math.max(2, mods.glassBlur ?? 20));
        // Inner glass surfaces (e.g. the GENZ Settings tab sections) follow
        // the same Glass Opacity / Blur Strength sliders as the frost layer,
        // with a slightly stronger tint so cards stay readable over the video.
        root.style.setProperty('--genz-glass-tint', (Math.min(0.85, Math.max(0.35, frostAlpha + 0.1))).toFixed(3));
        root.style.setProperty('--genz-glass-header-tint', (Math.min(0.9, Math.max(0.45, frostAlpha + 0.3))).toFixed(3));
        root.style.setProperty('--genz-glass-blur', `${frostBlur}px`);
        if (isPremiumActive && mods.glassMode) {
          frostLayer.style.background = `rgba(11, 20, 26, ${frostAlpha.toFixed(3)})`;
          frostLayer.style.backdropFilter = `blur(${frostBlur}px)`;
          frostLayer.style.webkitBackdropFilter = `blur(${frostBlur}px)`;
          frostLayer.style.display = 'block';
        } else {
          frostLayer.style.display = 'none';
        }
        const videoActive = Boolean(isPremiumActive && mods.glassMode && mods.videoBg && !String(mods.videoBg).startsWith('blob:'));
        if (videoActive) {
          if (videoBg.dataset.src !== mods.videoBg) {
            videoBg.src = mods.videoBg;
            videoBg.dataset.src = mods.videoBg;
          }
          videoBg.style.opacity = String(mods.videoBgOpacity ?? 0.4);
          videoBg.style.filter = `blur(${mods.videoBgBlur ?? 0}px)`;
          videoBg.style.display = 'block';
          videoBg.play().catch(() => {});
        } else {
          videoBg.removeAttribute('src');
          videoBg.load?.();
          videoBg.style.display = 'none';
        }
        // Image background — shown when glass mode is on and no video is set
        let bgImg = document.getElementById('genz-glass-img');
        if (!bgImg) {
          bgImg = document.createElement('img');
          bgImg.id = 'genz-glass-img';
          bgImg.alt = '';
          bgImg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;display:none;';
          document.body.prepend(bgImg);
        }
        const imgActive = Boolean(!videoActive && isPremiumActive && mods.glassMode && mods.bgImage && !String(mods.bgImage).startsWith('blob:'));
        if (imgActive) {
          if (bgImg.dataset.src !== mods.bgImage) {
            bgImg.src = mods.bgImage;
            bgImg.dataset.src = mods.bgImage;
          }
          bgImg.style.opacity = String(mods.bgImageOpacity ?? 0.55);
          bgImg.style.display = 'block';
        } else {
          bgImg.removeAttribute('src');
          bgImg.style.display = 'none';
        }
        initAntiScreenshotListeners();
        applyAntiScreenshot(isPremiumActive ? mods.antiScreenshot : null);
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
  }, [chatUser?._id, user?.premium, user?.subscriptionExpiresAt]);

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
      // closed, so messages only ever appeared while the app was open in the
      // foreground. Subscribing here, right after the service worker is
      // ready, is what actually enables background/locked-screen
      // notifications.
      if (permission === 'granted' && registration) {
        notificationService.subscribeToWebPush(registration).catch(() => {});
      }
    })();

    // Handle messages posted from the service worker (background push clicks)
    const handleServiceWorkerMessage = (event) => {
      const data = event.data || {};

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
  }, [setNotification]);

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

  // --- App Lock: Biometric authentication on resume (APK only) ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let isLocked = false;

    const checkAppLock = async () => {
      const isEnabled = localStorage.getItem('genz_biometric_enabled') === 'true';
      if (!isEnabled || isLocked) return;

      isLocked = true;
      try {
        const auth = await authenticateWithBiometric({
          reason: 'Unlock GENZ Messenger',
          allowDeviceCredential: true
        });
        if (!auth.verified) {
          CapacitorApp.minimizeApp();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('App lock error:', err);
      } finally {
        isLocked = false;
      }
    };

    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) setTimeout(checkAppLock, 300);
    });

    checkAppLock();

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return (
    <ErrorBoundary>
      <ConfirmDialogProvider>
      <PromptDialogProvider>
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
      <UpdateBanner />

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
            <Route path="/status/shared/:id" element={<SharedStatus />} />
            <Route path="/status" element={<ProtectedRoute><Status /></ProtectedRoute>} />
            <Route path="/broadcast" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
            <Route path="/broadcast/simple" element={<ProtectedRoute><Broadcast /></ProtectedRoute>} />
            <Route path="/linked-devices" element={<ProtectedRoute><LinkedDevices /></ProtectedRoute>} />
            <Route path="/pair-device" element={<PairDevice />} />
            <Route path="/settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
            <Route path="/starred" element={<ProtectedRoute><Starred /></ProtectedRoute>} />
            <Route path="/archived" element={<ProtectedRoute><Archived /></ProtectedRoute>} />
            {/* Admin routes — protected by AdminProtectedRoute (secret URL + TOTP auth) */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/manual-payments" element={<AdminProtectedRoute><AdminPaymentManagement /></AdminProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><SubscriptionPayment /></ProtectedRoute>} />
            <Route path="/genz-after-work" element={<ProtectedRoute><GenzAfterWork /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            {/* Hidden admin routes — secret paths for admin access */}
            <Route path="/admin-setup" element={<AdminProtectedRoute><AdminSetup /></AdminProtectedRoute>} />
            <Route path="/system-control-x7k9" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/system-control-x7k9/login" element={<AdminLogin />} />
            <Route path="/system-gateway-x9k" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/system-gateway-x9k/login" element={<AdminLogin />} />
            {/* GENZ Mods route removed - features merged into GENZ Settings */}
            <Route path="/winga" element={<ProtectedRoute><Winga /></ProtectedRoute>} />
            <Route path="/features" element={<ProtectedRoute><FeatureLibrary /></ProtectedRoute>} />
            <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
            <Route path="/join/:groupId/:code" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/install" element={<InstallGuide />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-phone" element={<VerifyPhone />} />
            <Route path="/" element={<NativeAwareLanding />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </AdminAuthProvider>
      {!user && <DownloadApkFab />}
      <MobileBottomNav />
      </PromptDialogProvider>
      </ConfirmDialogProvider>
    </ErrorBoundary>
  );
}

export default App;
