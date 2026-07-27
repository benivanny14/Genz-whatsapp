import React, { useState } from 'react';
import { Lock, X, Shield, Check, AlertCircle, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageEncryption = ({ chat, encryptionStatus, onVerify, onReset, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsVerifying(false);
    if (onVerify) {
      onVerify(chat._id);
    }
  };

  const encryptionLevels = {
    end_to_end: { label: 'End-to-End', color: 'text-green-500', icon: Shield },
    server: { label: 'Server', color: 'text-yellow-500', icon: Lock },
    none: { label: 'None', color: 'text-red-500', icon: AlertCircle }
  };

  const level = encryptionLevels[encryptionStatus.level] || encryptionLevels.end_to_end;
  const LevelIcon = level.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Message Encryption</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Encryption Status */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <LevelIcon size={24} className={level.color} />
            </div>
            <div>
              <p className="text-white font-medium">{level.label} Encrypted</p>
              <p className="text-gray-400 text-sm">
                {encryptionStatus.level === 'end_to_end' 
                  ? 'Messages are secured with end-to-end encryption'
                  : encryptionStatus.level === 'server'
                  ? 'Messages are encrypted at server level'
                  : 'Messages are not encrypted'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Encryption Details */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20 space-y-3"
          >
            <div>
              <p className="text-gray-400 text-xs mb-1">Encryption Type</p>
              <p className="text-white text-sm">{encryptionStatus.algorithm || 'AES-256'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Key Exchange</p>
              <p className="text-white text-sm">{encryptionStatus.keyExchange || 'Signal Protocol'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Last Verified</p>
              <p className="text-white text-sm">
                {encryptionStatus.lastVerified 
                  ? new Date(encryptionStatus.lastVerified).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Safety Number</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#1a2e35] px-3 py-2 rounded text-xs font-mono break-all">
                  {encryptionStatus.safetyNumber || 'Not available'}
                </code>
                <button
                  onClick={() => {
                    if (encryptionStatus.safetyNumber) {
                      navigator.clipboard.writeText(encryptionStatus.safetyNumber);
                    }
                  }}
                  className="text-[#00a884] hover:text-white transition-colors"
                  title="Copy"
                >
                  <Key size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
          >
            {showDetails ? <EyeOff size={18} /> : <Eye size={18} />}
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Verifying...
              </>
            ) : (
              <>
                <Shield size={18} />
                Verify Encryption
              </>
            )}
          </button>

          {encryptionStatus.level !== 'end_to_end' && (
            <button
              onClick={() => onReset?.(chat._id)}
              className="w-full bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Reset Encryption
            </button>
          )}
        </div>

        {/* Warning */}
        {encryptionStatus.level !== 'end_to_end' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Your messages may not be fully encrypted. Consider enabling end-to-end encryption for better security.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Encryption Indicator Component
export const EncryptionIndicator = ({ status }) => {
  const encryptionLevels = {
    end_to_end: { icon: Lock, color: 'text-green-500', label: 'End-to-end encrypted' },
    server: { icon: Lock, color: 'text-yellow-500', label: 'Server encrypted' },
    none: { icon: AlertCircle, color: 'text-red-500', label: 'Not encrypted' }
  };

  const level = encryptionLevels[status] || encryptionLevels.end_to_end;
  const Icon = level.icon;

  return (
    <div className={`flex items-center gap-1 ${level.color} text-xs`}>
      <Icon size={10} />
      <span>{level.label}</span>
    </div>
  );
};

// Encryption Settings Component
export const EncryptionSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Lock size={18} className="text-[#00a884]" />
            Message Encryption
          </p>
          <p className="text-gray-400 text-sm">Secure your messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, encryptionEnabled: !settings.encryptionEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.encryptionEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.encryptionEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.encryptionEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Encryption level</p>
            <select
              value={settings.encryptionLevel || 'end_to_end'}
              onChange={(e) => onUpdate({ ...settings, encryptionLevel: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="end_to_end">End-to-End</option>
              <option value="server">Server</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show encryption status</p>
              <p className="text-gray-400 text-xs">Display in chat header</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showEncryptionStatus: !settings.showEncryptionStatus })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showEncryptionStatus ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showEncryptionStatus ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-verify keys</p>
              <p className="text-gray-400 text-xs">Verify safety numbers automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoVerifyKeys: !settings.autoVerifyKeys })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoVerifyKeys ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoVerifyKeys ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Warn on unencrypted</p>
              <p className="text-gray-400 text-xs">Alert when encryption is disabled</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, warnUnencrypted: !settings.warnUnencrypted })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.warnUnencrypted ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.warnUnencrypted ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Safety Number Verification Component
export const SafetyNumberVerification = ({ contact, safetyNumber, onVerify, onChange }) => {
  const [localNumber, setLocalNumber] = useState(safetyNumber || '');
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = () => {
    if (localNumber === safetyNumber) {
      setIsVerified(true);
      onVerify?.(contact._id, localNumber);
    }
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <Key size={18} className="text-[#00a884]" />
        <h3 className="text-white font-semibold">Safety Number</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-gray-400 text-xs mb-1">Contact's safety number</p>
          <code className="block bg-[#1a2e35] px-3 py-2 rounded text-sm font-mono break-all">
            {safetyNumber}
          </code>
        </div>

        <div>
          <p className="text-gray-400 text-xs mb-1">Verify by comparing</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              placeholder="Enter safety number to verify"
              className="flex-1 bg-[#1a2e35] text-white px-3 py-2 rounded border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm font-mono"
            />
            <button
              onClick={handleVerify}
              disabled={localNumber !== safetyNumber}
              className="bg-[#00a884] text-white px-4 py-2 rounded hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Verify
            </button>
          </div>
        </div>

        {isVerified && (
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <Check size={16} />
            <span>Safety number verified</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageEncryption;
