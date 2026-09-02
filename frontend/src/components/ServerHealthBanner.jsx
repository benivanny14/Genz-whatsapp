import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, RefreshCw, X } from 'lucide-react';
import { resolveApiBase } from '../utils/resolveApiBase';

const HEALTH_CHECK_INTERVAL = 15000; // 15 seconds
const HEALTH_ENDPOINT = '/health';

/**
 * ServerHealthBanner — persistent banner that monitors backend reachability
 * via lightweight /health pings. Shows a dismissable overlay when the server
 * is unreachable and auto-hides when it recovers.
 *
 * Handles Render free-tier cold starts, transient connection resets, and
 * full server outages.
 */
const ServerHealthBanner = () => {
  const [isDown, setIsDown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const failCountRef = useRef(0);
  const intervalRef = useRef(null);

  const checkHealth = useCallback(async () => {
    const baseUrl = resolveApiBase() || '/api';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${baseUrl}${HEALTH_ENDPOINT}`, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        failCountRef.current = 0;
        setIsDown(false);
        setDismissed(false);
      } else {
        failCountRef.current += 1;
        if (failCountRef.current >= 2) setIsDown(true);
      }
    } catch (err) {
      failCountRef.current += 1;
      // Require 2 consecutive failures before showing banner
      if (failCountRef.current >= 2) setIsDown(true);
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay (let the app settle)
    const initialTimer = setTimeout(checkHealth, 5000);
    intervalRef.current = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  const handleRetry = async () => {
    setRetrying(true);
    await checkHealth();
    setRetrying(false);
  };

  if (!isDown || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99998] pointer-events-none">
      <div className="pointer-events-auto mx-2 mb-2 sm:mx-4 sm:mb-4">
        <div className="bg-red-900/95 backdrop-blur-md border border-red-500/50 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0">
            <WifiOff size={20} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-200 text-sm font-semibold">Server Unreachable</p>
            <p className="text-red-300/80 text-xs truncate">
              Backend may be starting up. Retrying every {HEALTH_CHECK_INTERVAL / 1000}s…
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex-shrink-0 p-2 rounded-lg bg-red-800/60 hover:bg-red-700/60 text-red-200 transition-colors disabled:opacity-50"
            title="Retry now"
          >
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-red-800/40 text-red-300/60 hover:text-red-200 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerHealthBanner;
