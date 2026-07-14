import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsReconnecting(false);
      setVisible(false);
      // Silent auto-refresh: re-fetch data when back online
      window.dispatchEvent(new Event('process-offline-queue'));
      window.dispatchEvent(new Event('socket-reconnect-request'));
    };

    const handleOffline = () => {
      setIsOffline(true);
      setVisible(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setVisible(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsReconnecting(true);
    window.dispatchEvent(new Event('process-offline-queue'));
    window.dispatchEvent(new Event('socket-reconnect-request'));
    setTimeout(() => {
      setIsReconnecting(false);
      if (navigator.onLine) {
        setIsOffline(false);
        setVisible(false);
      }
    }, 2000);
  };

  if (!isOffline || !visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-dark-surface/95 backdrop-blur-lg text-white px-4 py-3 flex items-center gap-3 rounded-xl shadow-xl border border-white/10 max-w-xs animate-in slide-in-from-bottom-2">
      <WifiOff size={16} className="text-orange-400 animate-pulse flex-shrink-0" />
      <p className="text-xs text-white/80">You're offline</p>
      <button
        onClick={handleRetry}
        disabled={isReconnecting}
        className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
       aria-label="Refresh">
        <RefreshCw size={14} className={isReconnecting ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default OfflineBanner;

