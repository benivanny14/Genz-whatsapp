import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
