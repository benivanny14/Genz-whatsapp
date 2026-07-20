import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isOffline } from '../services/api';

const OfflineIndicator = () => {
  const browserOffline = isOffline();

  if (!browserOffline) return null;

  const handleRetry = () => {
    window.dispatchEvent(new Event('process-offline-queue'));
    window.dispatchEvent(new Event('socket-reconnect-request'));
    if (browserOffline) window.location.reload();
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-md">
      <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">Huna mtandao</h3>
        <p className="text-xs text-yellow-700">Ujumbe utatumwa utakaporudi mtandaoni.</p>
      </div>
      <button
        onClick={handleRetry}
        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors flex items-center shrink-0"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Jaribu
      </button>
    </div>
  );
};

export default OfflineIndicator;
