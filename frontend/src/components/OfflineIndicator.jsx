import React from 'react';
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { isOffline } from '../services/api';

const OfflineIndicator = () => {
  if (!isOffline()) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
      <AlertCircle className="w-5 h-5 text-yellow-600" />
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">Offline Mode</h3>
        <p className="text-xs text-yellow-700">
          Backend server is not running. Please start the server on port 5000.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors flex items-center"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </button>
    </div>
  );
};

export default OfflineIndicator;
