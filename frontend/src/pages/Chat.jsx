import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LockScreen, { useInactivityLock, saveSecurePin } from '../components/LockScreen';
import OfflineIndicator from '../components/OfflineIndicator';
import ErrorBoundary from '../components/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Wifi, WifiOff, Grid3x3 } from 'lucide-react';

const ChatArea = lazy(() => import('../components/ChatArea'));
const GENZSettings = lazy(() => import('../components/GENZSettings'));
const FeatureIntegrationPanel = lazy(() => import('../components/FeatureIntegrationPanel'));

const PanelLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
    <div className="w-10 h-10 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
  </div>
);

const Chat = () => {
  const { activeCall, endCall, acceptCall, rejectCall, activeGroupCall, setActiveGroupCall, onlineNotification, isSocketConnected, mods, setMods, selectedConversation } = useChat();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGENZSettings, setShowGENZSettings] = useState(false);
  const [showFeaturePanel, setShowFeaturePanel] = useState(false);

  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('genz_lock_type') === 'pin' && !!localStorage.getItem('genz_pin_hash');
  });
  const [lockPin, setLockPin] = useState('');
  const [lockType, setLockType] = useState(() => localStorage.getItem('genz_lock_type') || 'none');

  const lockApp = useCallback(() => {
    if (mods?.enableAppLock && lockType !== 'none') setIsLocked(true);
  }, [mods?.enableAppLock, lockType]);

  const unlockApp = () => setIsLocked(false);

  // Inactivity auto-lock (Phase 4)
  useInactivityLock(mods?.enableAppLock && lockType !== 'none', lockApp);

  // When user sets a new PIN, hash and store it securely
  const handleSetLockPin = async (pin) => {
    setLockPin(pin);
    if (pin.length === 4) await saveSecurePin(pin);
  };

  if (isLocked) {
    return <LockScreen onUnlock={unlockApp} correctPin={lockPin} />;
  }

  return (
    <div
      className="fixed inset-0 md:relative md:w-screen bg-[#dadbd3] flex items-center justify-center overflow-hidden font-sans"
      style={{
        height: 'var(--app-height, 100dvh)',
        // Keeps the header/input bar from sliding off the top of the
        // screen when the on-screen keyboard opens (see
        // utils/useViewportHeight.js for the full explanation).
        transform: 'translateY(var(--app-offset-top, 0px))'
      }}
    >
      {/* Offline indicator */}
      <OfflineIndicator />

      {/* Active call overlay */}
      {/* Online notification toast */}
      <AnimatePresence>
        {onlineNotification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <Bell size={16} className="animate-bounce" />
            <span className="text-sm font-bold">{onlineNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Socket connection indicator - hidden from users, only shown in dev */}
      {import.meta.env.DEV && (
        <div className={`fixed bottom-2 left-2 z-[999] flex items-center gap-1 text-[10px] px-2 py-1 rounded-full opacity-30 hover:opacity-100 transition-opacity ${isSocketConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {isSocketConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isSocketConnected ? 'Live' : 'Offline'}
        </div>
      )}

      <div className="w-full h-full md:w-[98%] md:h-[96%] bg-[#f0f2f5] shadow-2xl flex relative overflow-hidden">
        {/* Sidebar Container: Toggle visible/hidden based on whether conversation is active on mobile screens */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} h-full flex-shrink-0 ${sidebarOpen ? 'w-full md:w-80' : 'w-0 md:w-0 overflow-hidden'}`}>
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onLogout={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            openGENZ={() => setShowGENZSettings(true)}
            mods={mods}
          />
        </div>

        {/* Chat Area Container: Toggle visible/hidden based on whether conversation is active on mobile screens */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 h-full min-w-0 w-full ${sidebarOpen ? '' : 'md:ml-0'}`}>
          <Suspense fallback={<PanelLoader />}>
            <ErrorBoundary>
              <ChatArea
                mods={mods}
                onOpenGENZSettings={() => setShowGENZSettings(true)}
                sidebarOpen={sidebarOpen}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </ErrorBoundary>
          </Suspense>
        </div>

        {/* Floating More Features Button - always visible */}
        <button
          onClick={() => setShowFeaturePanel(true)}
          className="fixed bottom-6 left-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform hover:shadow-pink-500/30"
          title="✨ More Features"
        >
          <Grid3x3 size={22} className="text-white" />
        </button>

        {/* Feature Integration Panel */}
        <AnimatePresence>
          {showFeaturePanel && (
            <Suspense fallback={<PanelLoader />}>
              <FeatureIntegrationPanel
                conversation={selectedConversation}
                messages={[]}
                messagesContainerRef={null}
                currentUserId={user?._id || user?.id}
                onClose={() => setShowFeaturePanel(false)}
              />
            </Suspense>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGENZSettings && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-[100] bg-white w-full h-full min-h-0 md:w-[400px] md:right-0 shadow-2xl border-l border-gray-200 flex flex-col"
            >
              <Suspense fallback={<PanelLoader />}>
                <GENZSettings
                  close={() => setShowGENZSettings(false)}
                  mods={mods}
                  setMods={setMods}
                  lockType={lockType}
                  setLockType={setLockType}
                  setLockPin={handleSetLockPin}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;
