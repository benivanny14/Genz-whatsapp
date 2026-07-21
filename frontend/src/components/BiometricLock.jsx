import React, { useState, useEffect } from 'react';
import { Fingerprint, X, Check, AlertTriangle, RefreshCw, Shield, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BiometricLock = ({ isEnabled, onToggle, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    setIsScanning(true);
    setError('');
    setScanResult(null);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate biometric scan
    const success = Math.random() > 0.2; // 80% success rate
    setIsScanning(false);

    if (success) {
      setScanResult('success');
      if (onToggle) {
        onToggle(!isEnabled);
      }
    } else {
      setScanResult('failed');
      setError('Biometric authentication failed. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Fingerprint className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Biometric Lock</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isEnabled ? 'bg-[#00a884]/20' : 'bg-[#0b141a]'
          }`}>
            {isEnabled ? (
              <Lock size={48} className="text-[#00a884]" />
            ) : (
              <Unlock size={48} className="text-gray-400" />
            )}
          </div>
          <p className="text-white font-medium mb-1">
            {isEnabled ? 'Biometric Lock Enabled' : 'Biometric Lock Disabled'}
          </p>
          <p className="text-gray-400 text-sm">
            {isEnabled ? 'Use fingerprint to unlock' : 'Enable biometric authentication'}
          </p>
        </div>

        {/* Scan Animation */}
        {isScanning && (
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full mx-auto mb-4 bg-[#00a884]/20 flex items-center justify-center"
            >
              <Fingerprint size={40} className="text-[#00a884]" />
            </motion.div>
            <p className="text-gray-400 text-sm">Scanning fingerprint...</p>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={`text-center mb-6 p-4 rounded-lg ${
            scanResult === 'success'
              ? 'bg-[#00a884]/10 border border-[#00a884]/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {scanResult === 'success' ? (
              <Check size={32} className="text-[#00a884] mx-auto mb-2" />
            ) : (
              <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
            )}
            <p className={`text-sm ${
              scanResult === 'success' ? 'text-[#00a884]' : 'text-red-500'
            }`}>
              {scanResult === 'success' ? 'Authentication successful!' : 'Authentication failed'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-red-500 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-blue-500 text-xs">
              Biometric authentication uses your device's fingerprint sensor for secure access.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Scanning...
            </>
          ) : (
            <>
              {isEnabled ? (
                <>
                  <Unlock size={18} />
                  Disable Biometric
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Enable Biometric
                </>
              )}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Biometric Lock Settings Component
export const BiometricLockSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Fingerprint size={18} className="text-[#00a884]" />
            Biometric Lock
          </p>
          <p className="text-gray-400 text-sm">Use fingerprint to unlock</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, biometricLockEnabled: !settings.biometricLockEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.biometricLockEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.biometricLockEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.biometricLockEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-lock timeout</p>
              <p className="text-gray-400 text-xs">Lock after inactivity</p>
            </div>
            <select
              value={settings.biometricTimeout || 'immediate'}
              onChange={(e) => onUpdate({ ...settings, biometricTimeout: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="immediate">Immediate</option>
              <option value="30s">30 seconds</option>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require on app start</p>
              <p className="text-gray-400 text-xs">Authenticate on launch</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, biometricOnStart: !settings.biometricOnStart })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.biometricOnStart ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.biometricOnStart ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Fallback to PIN</p>
              <p className="text-gray-400 text-xs">Use PIN if biometric fails</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, biometricFallbackPin: !settings.biometricFallbackPin })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.biometricFallbackPin ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.biometricFallbackPin ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Biometric Lock Button Component
export const BiometricLockButton = ({ onOpen, isEnabled }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Biometric lock"
    >
      <Fingerprint size={18} />
    </button>
  );
};

// Biometric Lock Indicator Component
export const BiometricLockIndicator = ({ isEnabled }) => {
  return (
    <AnimatePresence>
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1"
        >
          <Fingerprint size={14} className="text-[#00a884]" />
          <span className="text-white text-xs">Biometric</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Biometric Auth Prompt Component
export const BiometricAuthPrompt = ({ onAuthenticate, onCancel }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleAuthenticate = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsScanning(false);
    onAuthenticate?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-[#00a884]/20 flex items-center justify-center">
          {isScanning ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Fingerprint size={40} className="text-[#00a884]" />
            </motion.div>
          ) : (
            <Fingerprint size={40} className="text-[#00a884]" />
          )}
        </div>
        <h3 className="text-white font-semibold mb-2">Authenticate</h3>
        <p className="text-gray-400 text-sm mb-6">Use your fingerprint to continue</p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAuthenticate}
            disabled={isScanning}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed"
          >
            {isScanning ? 'Scanning...' : 'Authenticate'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BiometricLock;
