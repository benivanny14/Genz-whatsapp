import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { getAuthToken } from '../utils/tokenStore';

// Opt-in server-side crash reporting: the user enables it in GENZSettings
// (`genz_crash_reporting`), after which each caught render crash POSTs a small
// { route, message } record to /api/telemetry/crashes so admins can see
// regressions across all browsers, not just the one in front of them.
const CRASH_REPORTING_KEY = 'genz_crash_reporting';

function reportCrashToServer(route, message) {
  try {
    if (localStorage.getItem(CRASH_REPORTING_KEY) !== '1') return; // opt-in only
    const token = getAuthToken();
    if (!token) return; // anonymous visitor — nothing to attribute
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    fetch(`${base}/telemetry/crashes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ route, message: String(message || '').slice(0, 2000) }),
      keepalive: true // fire-and-forget even if the page is being replaced
    }).catch(() => {});
  } catch {
    // Best-effort only — a crash report must never crash the app again.
  }
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in dev; replace with Sentry in production
    console.error('[GENZ ErrorBoundary]', error, errorInfo);

    // Lightweight crash analytics: keep a per-route counter in localStorage so
    // regressions (missing imports, null-unsafe renders) are visible in
    // staging/dev without an external error service. Best-effort only.
    try {
      const key = 'genz_boundary_crashes';
      const raw = localStorage.getItem(key);
      const counts = raw ? JSON.parse(raw) : {};
      const route = window.location.pathname || '/';
      counts[route] = (counts[route] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(counts));
      console.info('[GENZ ErrorBoundary] crash recorded', { route, total: counts[route] });
      reportCrashToServer(route, error?.message);
    } catch {
      // Storage unavailable (private mode / quota) — analytics are optional.
    }

    // A lazy-loaded route/chunk failed to import — almost always means the
    // browser still has an old build's index.html/JS in memory while the
    // server now serves newer, differently-hashed asset files (post-deploy).
    // Retrying in-place would hit the same dead URL again, so force one
    // full reload to pick up the current build instead of leaving the user
    // stuck on a screen that never updates.
    const isChunkLoadError = /dynamically imported module|loading chunk|importing a module script failed/i.test(
      String(error?.message || '')
    );
    if (isChunkLoadError) {
      const reloadedKey = 'genz_chunk_reload_at';
      const lastReload = Number(sessionStorage.getItem(reloadedKey) || 0);
      // Only auto-reload once every 10s to avoid a refresh loop if the
      // server itself is the problem rather than a stale local cache.
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem(reloadedKey, String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback, minimal } = this.props;

      // Custom fallback provided by parent
      if (fallback) return fallback;

      // Minimal inline fallback (for small components)
      if (minimal) {
        return (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            <AlertTriangle size={14} />
            <span>Component error.</span>
            <button
              onClick={this.handleRetry}
              className="ml-auto flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        );
      }

      // Full-page fallback
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Kitu kimekosea</h3>
          <p className="text-white/50 text-sm mb-6 max-w-xs">
            {this.state.error?.message || 'Hitilafu isiyotarajiwa imetokea. Jaribu tena.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[#008069] hover:bg-[#007a5e] text-white rounded-xl font-semibold text-sm transition-all"
            >
              <RefreshCw size={16} /> Jaribu Tena
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-all"
            >
              <Home size={16} /> Nyumbani
            </button>
          </div>
          {import.meta.env.DEV && this.state.errorInfo && (
            <details className="mt-4 text-left w-full max-w-md">
              <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50">
                Stack trace (dev only)
              </summary>
              <pre className="text-[10px] text-red-300 bg-black/40 p-3 rounded-lg mt-2 overflow-auto max-h-40">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for lazy-loaded components
export const withErrorBoundary = (Component, options = {}) => {
  return function WrappedWithBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary;
