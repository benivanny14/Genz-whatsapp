import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, Timer, Shield, Check, X, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLock = ({ isEnabled, onToggle, onUnlock, onClose }) => {
  const [lockType, setLockType] = useState('pin'); // 'pin', 'pattern', 'fingerprint'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [lockTimeout, setLockTimeout] = useState('immediate'); // 'immediate', '30s', '1m', '5m', '30m'
  const [step, setStep] = useState('check'); // check, setup, verify, unlock
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const timeoutOptions = [
    { value: 'immediate', label: 'Immediately' },
    { value: '30s', label: '30 seconds' },
    { value: '1m', label: '1 minute' },
    { value: '5m', label: '5 minutes' },
    { value: '30m', label: '30 minutes' },
  ];

  const handleSetup = async () => {
    if (lockType === 'pin') {
      if (pin.length !== 4) {
        setError('PIN must be 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
    }

    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsVerifying(false);

    if (onToggle) {
      onToggle({
        type: lockType,
        pin: lockType === 'pin' ? pin : null,
        timeout: lockTimeout
      });
    }
    setStep('check');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleUnlock = async () => {
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsVerifying(false);

    if (pin === '1234') { // Simulated verification
      onUnlock?.();
      setPin('');
      setError('');
    } else {
      setError('Incorrect PIN');
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
            <Smartphone className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">App Lock</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Check Status */}
        {step === 'check' && (
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
              {isEnabled ? 'App Lock Enabled' : 'App Lock Disabled'}
            </p>
            <p className="text-gray-400 text-sm">
              {isEnabled ? 'Secure your app with lock' : 'Protect your WhatsApp'}
            </p>
          </div>
        )}

        {/* Setup */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Lock Type</p>
              <div className="grid grid-cols-3 gap-2">
                {['pin', 'pattern', 'fingerprint'].map(type => (
                  <button
                    key={type}
                    onClick={() => setLockType(type)}
                    className={`p-3 rounded-lg text-center capitalize transition-all ${
                      lockType === type
                        ? 'bg-[#00a884] text-white'
                        : 'bg-[#0b141a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {lockType === 'pin' && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Set PIN</p>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-center text-2xl tracking-widest"
                  />
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {lockType === 'pin' && pin.length === 4 && (
              <div>
                <p className="text-gray-400 text-sm mb-2">Confirm PIN</p>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm PIN"
                  maxLength={4}
                  className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-center text-2xl tracking-widest"
                />
              </div>
            )}

            <div>
              <p className="text-gray-400 text-sm mb-2">Auto-lock timeout</p>
              <select
                value={lockTimeout}
                onChange={(e) => setLockTimeout(e.target.value)}
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                {timeoutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('check')}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetup}
                disabled={isVerifying}
                className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Setting up...
                  </>
                ) : (
                  'Enable'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Check Status Actions */}
        {step === 'check' && (
          <div className="space-y-3">
            {isEnabled ? (
              <button
                onClick={() => onToggle?.(null)}
                className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors"
              >
                Disable App Lock
              </button>
            ) : (
              <button
                onClick={() => setStep('setup')}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
              >
                Enable App Lock
              </button>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-blue-500 text-xs">
                  App Lock adds an extra layer of security to protect your messages and data.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// App Lock Settings Component
export const AppLockSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Smartphone size={18} className="text-[#00a884]" />
            App Lock
          </p>
          <p className="text-gray-400 text-sm">Lock the entire app</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, appLockEnabled: !settings.appLockEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.appLockEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.appLockEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.appLockEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Lock type</p>
            <select
              value={settings.appLockType || 'pin'}
              onChange={(e) => onUpdate({ ...settings, appLockType: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="pin">PIN</option>
              <option value="pattern">Pattern</option>
              <option value="fingerprint">Fingerprint</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Auto-lock timeout</p>
            <select
              value={settings.appLockTimeout || 'immediate'}
              onChange={(e) => onUpdate({ ...settings, appLockTimeout: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="immediate">Immediately</option>
              <option value="30s">30 seconds</option>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Lock on background</p>
              <p className="text-gray-400 text-xs">Lock when app is minimized</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, lockOnBackground: !settings.lockOnBackground })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.lockOnBackground ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.lockOnBackground ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// App Lock Button Component
export const AppLockButton = ({ onOpen, isEnabled }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="App lock"
    >
      {isEnabled ? <Lock size={18} /> : <Unlock size={18} />}
    </button>
  );
};

// App Lock Indicator Component
export const AppLockIndicator = ({ isEnabled }) => {
  return (
    <AnimatePresence>
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1"
        >
          <Lock size={14} className="text-[#00a884]" />
          <span className="text-white text-xs">Locked</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLock;
