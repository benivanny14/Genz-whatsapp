import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsReconnecting(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
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
      if (navigator.onLine) setIsOffline(false);
    }, 2000);
  };

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <WifiOff size={20} className="animate-pulse" />
        <div>
          <p className="font-semibold text-sm">You're offline</p>
          <p className="text-xs opacity-90">Some features may not work</p>
        </div>
      </div>
      <button
        onClick={handleRetry}
        disabled={isReconnecting}
        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
      >
        <RefreshCw size={16} className={isReconnecting ? 'animate-spin' : ''} />
        <span className="text-sm font-medium">
          {isReconnecting ? 'Reconnecting...' : 'Retry'}
        </span>
      </button>
    </div>
  );
};

export default OfflineBanner;
