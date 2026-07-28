import React, { useState, useEffect, useRef } from 'react';
import { X, Bug, FileText, Network, Database, Settings, AlertTriangle, Trash2 } from 'lucide-react';

const DebugFeaturesPanel = ({ onClose }) => {
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [networkLogs, setNetworkLogs] = useState([]);
  const [dbData, setDbData] = useState([]);
  const [sharedPrefs, setSharedPrefs] = useState({});
  const [localStorageData, setLocalStorageData] = useState({});
  const [sessionStorageData, setSessionStorageData] = useState({});
  const originalConsoleLog = useRef(null);
  const originalConsoleError = useRef(null);
  const originalConsoleWarn = useRef(null);

  const mockLogs = [
    { id: 1, timestamp: '2024-01-15 10:30:45', level: 'INFO', message: 'App initialized successfully' },
    { id: 2, timestamp: '2024-01-15 10:30:46', level: 'DEBUG', message: 'Loading user data' },
    { id: 3, timestamp: '2024-01-15 10:30:47', level: 'INFO', message: 'Connected to backend' },
    { id: 4, timestamp: '2024-01-15 10:30:48', level: 'WARN', message: 'Slow network detected' },
    { id: 5, timestamp: '2024-01-15 10:30:49', level: 'ERROR', message: 'Failed to fetch contacts' }
  ];

  const mockNetworkLogs = [
    { id: 1, timestamp: '10:30:45', method: 'GET', url: '/api/user', status: 200, duration: '120ms' },
    { id: 2, timestamp: '10:30:46', method: 'POST', url: '/api/login', status: 200, duration: '350ms' },
    { id: 3, timestamp: '10:30:47', method: 'GET', url: '/api/chats', status: 200, duration: '180ms' },
    { id: 4, timestamp: '10:30:48', method: 'GET', url: '/api/status', status: 500, duration: '5000ms' }
  ];

  const mockDbData = [
    { id: 1, table: 'users', count: 1250, size: '2.5MB' },
    { id: 2, table: 'chats', count: 5420, size: '8.2MB' },
    { id: 3, table: 'messages', count: 15420, size: '25.4MB' },
    { id: 4, table: 'status', count: 320, size: '1.1MB' }
  ];

  const mockSharedPrefs = {
    theme: 'dark',
    language: 'en',
    notifications: true,
    soundEnabled: true,
    lastLogin: '2024-01-15T10:30:00Z'
  };

  const handleForceCrash = () => {
    console.log('Force crash triggered');
    throw new Error('Force crash for testing');
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      console.log('Clearing all data');
      localStorage.clear();
      sessionStorage.clear();
      alert('All data cleared');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleClearNetworkLogs = () => {
    setNetworkLogs([]);
  };

  // Load localStorage and sessionStorage data
  const loadStorageData = () => {
    const localData = {};
    const sessionData = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      localData[key] = localStorage.getItem(key);
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      sessionData[key] = sessionStorage.getItem(key);
    }
    
    setLocalStorageData(localData);
    setSessionStorageData(sessionData);
  };

  // Override console functions when debug mode is enabled
  useEffect(() => {
    if (debugMode) {
      originalConsoleLog.current = console.log;
      originalConsoleError.current = console.error;
      originalConsoleWarn.current = console.warn;

      console.log = (...args) => {
        const timestamp = new Date().toISOString();
        setLogs(prev => [...prev, {
          id: Date.now(),
          timestamp,
          level: 'INFO',
          message: args.join(' ')
        }]);
        originalConsoleLog.current(...args);
      };

      console.error = (...args) => {
        const timestamp = new Date().toISOString();
        setLogs(prev => [...prev, {
          id: Date.now(),
          timestamp,
          level: 'ERROR',
          message: args.join(' ')
        }]);
        originalConsoleError.current(...args);
      };

      console.warn = (...args) => {
        const timestamp = new Date().toISOString();
        setLogs(prev => [...prev, {
          id: Date.now(),
          timestamp,
          level: 'WARN',
          message: args.join(' ')
        }]);
        originalConsoleWarn.current(...args);
      };

      loadStorageData();
    } else {
      // Restore original console functions
      if (originalConsoleLog.current) console.log = originalConsoleLog.current;
      if (originalConsoleError.current) console.error = originalConsoleError.current;
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
    }

    return () => {
      // Cleanup on unmount
      if (originalConsoleLog.current) console.log = originalConsoleLog.current;
      if (originalConsoleError.current) console.error = originalConsoleError.current;
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
    };
  }, [debugMode]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Bug className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Debug & Developer Features</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Debug Mode Toggle */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Debug Mode</p>
                  <p className="text-white/50 text-sm">Enable detailed logging</p>
                </div>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  debugMode ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Log Viewer */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#00a884]" />
                <h3 className="text-white font-medium">Log Viewer</h3>
              </div>
              <button
                onClick={handleClearLogs}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
            <div className="bg-black/50 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40">
                  <FileText size={24} />
                  <p className="mt-2">No logs available</p>
                  <button
                    onClick={() => setLogs(mockLogs)}
                    className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    Load Sample Logs
                  </button>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`mb-1 ${
                      log.level === 'ERROR' ? 'text-red-400' :
                      log.level === 'WARN' ? 'text-yellow-400' :
                      log.level === 'DEBUG' ? 'text-blue-400' :
                      'text-green-400'
                    }`}
                  >
                    <span className="text-white/40">[{log.timestamp}]</span>
                    <span className="ml-2">[{log.level}]</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Network Logger */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-[#00a884]" />
                <h3 className="text-white font-medium">Network Logger</h3>
              </div>
              <button
                onClick={handleClearNetworkLogs}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
            <div className="bg-black/50 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
              {networkLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40">
                  <Network size={24} />
                  <p className="mt-2">No network logs</p>
                  <button
                    onClick={() => setNetworkLogs(mockNetworkLogs)}
                    className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                  >
                    Load Sample Logs
                  </button>
                </div>
              ) : (
                networkLogs.map((log) => (
                  <div key={log.id} className="mb-1">
                    <span className="text-white/40">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.status >= 200 && log.status < 300 ? 'text-green-400' :
                      log.status >= 400 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {log.method}
                    </span>
                    <span className="text-white ml-2">{log.url}</span>
                    <span className={`ml-2 ${
                      log.status >= 200 && log.status < 300 ? 'text-green-400' :
                      log.status >= 400 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {log.status}
                    </span>
                    <span className="text-white/40 ml-2">({log.duration})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Database Viewer */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Database Viewer</h3>
            </div>
            <div className="space-y-2">
              {mockDbData.map((table) => (
                <div key={table.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white font-medium">{table.table}</p>
                    <p className="text-white/40 text-xs">{table.count} records</p>
                  </div>
                  <span className="text-white/60 text-sm">{table.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* LocalStorage Viewer */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#00a884]" />
                <h3 className="text-white font-medium">LocalStorage</h3>
              </div>
              <button
                onClick={loadStorageData}
                className="text-[#00a884] hover:text-[#008f6f] text-sm"
              >
                Refresh
              </button>
            </div>
            <div className="bg-black/50 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
              {Object.keys(localStorageData).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40">
                  <Database size={24} />
                  <p className="mt-2">No localStorage data</p>
                </div>
              ) : (
                Object.entries(localStorageData).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="text-[#00a884]">{key}:</span>
                    <span className="text-white ml-2">{String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SessionStorage Viewer */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[#00a884]" />
                <h3 className="text-white font-medium">SessionStorage</h3>
              </div>
              <button
                onClick={loadStorageData}
                className="text-[#00a884] hover:text-[#008f6f] text-sm"
              >
                Refresh
              </button>
            </div>
            <div className="bg-black/50 rounded-lg p-3 h-40 overflow-y-auto font-mono text-xs">
              {Object.keys(sessionStorageData).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/40">
                  <Settings size={24} />
                  <p className="mt-2">No sessionStorage data</p>
                </div>
              ) : (
                Object.entries(sessionStorageData).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="text-[#00a884]">{key}:</span>
                    <span className="text-white ml-2">{String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={18} className="text-red-400" />
              <h3 className="text-red-400 font-medium">Danger Zone</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleForceCrash}
                className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                Force Crash
              </button>
              <button
                onClick={handleClearAllData}
                className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Close Debug Panel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugFeaturesPanel;
