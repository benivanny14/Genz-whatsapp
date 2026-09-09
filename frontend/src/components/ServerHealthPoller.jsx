import { useEffect, useRef, useState } from 'react';
import { ServerCrash, RefreshCw } from 'lucide-react';

/**
 * ServerHealthPoller — polls /api/health/live every 30s to detect server outages
 * even when the device has network connectivity. Shows a banner when the backend
 * is unreachable.
 */
const POLL_INTERVAL = 30000; // 30 seconds
const TIMEOUT_MS = 8000;
const CONSECUTIVE_FAILURES = 2; // show banner after 2 consecutive failures

const ServerHealthPoller = () => {
  const [serverDown, setServerDown] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const failCountRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkHealth = async () => {
      // Skip if already offline (OfflineBanner handles that)
      if (!navigator.onLine) {
        failCountRef.current = 0;
        setServerDown(false);
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch('/api/health/live', {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeout);

        if (res.ok) {
          failCountRef.current = 0;
          setServerDown(false);
        } else {
          failCountRef.current++;
          if (failCountRef.current >= CONSECUTIVE_FAILURES) {
            setServerDown(true);
          }
        }
      } catch {
        failCountRef.current++;
        if (failCountRef.current >= CONSECUTIVE_FAILURES) {
          setServerDown(true);
        }
      }
    };

    // Initial check after 5s
    const initialTimer = setTimeout(checkHealth, 5000);
    intervalRef.current = setInterval(checkHealth, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    failCountRef.current = 0;
    setServerDown(false);
    // Re-check after a brief moment
    setTimeout(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch('/api/health/live', {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeout);
        if (res.ok) {
          setIsRetrying(false);
          // Reconnected — process offline queue
          window.dispatchEvent(new Event('process-offline-queue'));
          window.dispatchEvent(new Event('socket-reconnect-request'));
          return;
        }
      } catch {
        // still down
      }
      setIsRetrying(false);
      setServerDown(true);
      failCountRef.current = CONSECUTIVE_FAILURES;
    }, 2000);
  };

  if (!serverDown) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-900/95 backdrop-blur-lg text-white px-4 py-3 flex items-center gap-3 rounded-xl shadow-xl border border-red-500/30 max-w-xs animate-slideUp">
      <ServerCrash size={16} className="text-red-400 animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">Server iko down</p>
        <p className="text-[10px] text-white/60">Jaribu tena baadaye</p>
      </div>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        aria-label="Retry"
      >
        <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};

export default ServerHealthPoller;
