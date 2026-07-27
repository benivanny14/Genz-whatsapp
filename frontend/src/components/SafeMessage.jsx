import React, { useState } from 'react';
import { Shield, X, Check, AlertTriangle, RefreshCw, Lock, Eye, Scan, FileText, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SafeMessage = ({ message, onVerify, onReport, onClose }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsVerifying(false);
    setScanResult({
      isSafe: true,
      scanTime: new Date().toISOString(),
      threats: []
    });
    if (onVerify) {
      onVerify(message._id);
    }
  };

  const getSafetyLevel = () => {
    if (!scanResult) return 'unknown';
    if (scanResult.isSafe) return 'safe';
    if (scanResult.threats.length > 0) return 'dangerous';
    return 'suspicious';
  };

  const safetyColors = {
    safe: 'text-green-500',
    suspicious: 'text-yellow-500',
    dangerous: 'text-red-500',
    unknown: 'text-gray-400'
  };

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
            <Shield className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Message Safety</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <div className="flex items-start gap-2 mb-2">
            {message.type === 'text' && <FileText size={16} className="text-gray-400" />}
            {message.type === 'link' && <LinkIcon size={16} className="text-gray-400" />}
            <p className="text-gray-400 text-xs">{message.type}</p>
          </div>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
          <p className="text-gray-500 text-xs mt-2">{new Date(message.timestamp).toLocaleString()}</p>
        </div>

        {/* Scan Status */}
        {!scanResult ? (
          <div className="text-center py-8">
            {isVerifying ? (
              <div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 mx-auto mb-4"
                >
                  <Scan size={64} className="text-[#00a884]" />
                </motion.div>
                <p className="text-gray-400 text-sm">Scanning message...</p>
              </div>
            ) : (
              <div>
                <Shield size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm mb-4">Message not scanned yet</p>
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-[#00a884] text-white px-6 py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan size={18} />
                      Scan Message
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scan Result */}
            <div className={`bg-[#0b141a] rounded-lg p-4 border ${
              getSafetyLevel() === 'safe'
                ? 'border-green-500/50'
                : getSafetyLevel() === 'dangerous'
                ? 'border-red-500/50'
                : 'border-yellow-500/50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  getSafetyLevel() === 'safe'
                    ? 'bg-green-500/20'
                    : getSafetyLevel() === 'dangerous'
                    ? 'bg-red-500/20'
                    : 'bg-yellow-500/20'
                }`}>
                  {getSafetyLevel() === 'safe' && <Check size={24} className="text-green-500" />}
                  {getSafetyLevel() === 'dangerous' && <AlertTriangle size={24} className="text-red-500" />}
                  {getSafetyLevel() === 'suspicious' && <AlertTriangle size={24} className="text-yellow-500" />}
                </div>
                <div>
                  <p className={`text-white font-medium capitalize ${safetyColors[getSafetyLevel()]}`}>
                    {getSafetyLevel()}
                  </p>
                  <p className="text-gray-400 text-xs">Scanned at {new Date(scanResult.scanTime).toLocaleTimeString()}</p>
                </div>
              </div>

              {scanResult.threats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-white text-sm font-medium">Threats detected:</p>
                  {scanResult.threats.map((threat, index) => (
                    <div key={index} className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertTriangle size={14} />
                      <span>{threat}</span>
                    </div>
                  ))}
                </div>
              )}

              {scanResult.threats.length === 0 && (
                <p className="text-green-400 text-sm">No threats detected. This message appears to be safe.</p>
              )}
            </div>

            {/* Actions */}
            {getSafetyLevel() !== 'safe' && (
              <button
                onClick={() => onReport?.(message._id)}
                className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                Report as Unsafe
              </button>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Rescan
            </button>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-blue-500 text-xs">
              Message safety scan checks for malicious links, phishing attempts, and suspicious content.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Safe Message Settings Component
export const SafeMessageSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Safe Message
          </p>
          <p className="text-gray-400 text-sm">Scan messages for threats</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, safeMessageEnabled: !settings.safeMessageEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.safeMessageEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.safeMessageEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.safeMessageEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-scan incoming messages</p>
              <p className="text-gray-400 text-xs">Scan automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoScanMessages: !settings.autoScanMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoScanMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoScanMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Scan links</p>
              <p className="text-gray-400 text-xs">Check URL safety</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, scanLinks: !settings.scanLinks })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.scanLinks ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.scanLinks ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Scan attachments</p>
              <p className="text-gray-400 text-xs">Check file safety</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, scanAttachments: !settings.scanAttachments })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.scanAttachments ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.scanAttachments ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Block unsafe messages</p>
              <p className="text-gray-400 text-xs">Auto-block threats</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, blockUnsafeMessages: !settings.blockUnsafeMessages })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.blockUnsafeMessages ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.blockUnsafeMessages ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Safe Message Button Component
export const SafeMessageButton = ({ onOpen, message }) => {
  return (
    <button
      onClick={() => onOpen?.(message)}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Check message safety"
    >
      <Shield size={18} />
    </button>
  );
};

// Safety Indicator Component
export const SafetyIndicator = ({ safetyLevel }) => {
  const safetyColors = {
    safe: 'bg-green-500',
    suspicious: 'bg-yellow-500',
    dangerous: 'bg-red-500',
    unknown: 'bg-gray-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-2 h-2 rounded-full ${safetyColors[safetyLevel] || safetyColors.unknown}`}
    />
  );
};

// Message Safety Badge Component
export const MessageSafetyBadge = ({ safetyLevel, onClick }) => {
  const safetyIcons = {
    safe: Check,
    suspicious: AlertTriangle,
    dangerous: AlertTriangle,
    unknown: Shield
  };

  const safetyColors = {
    safe: 'text-green-500',
    suspicious: 'text-yellow-500',
    dangerous: 'text-red-500',
    unknown: 'text-gray-400'
  };

  const Icon = safetyIcons[safetyLevel] || Shield;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 ${safetyColors[safetyLevel]} hover:opacity-80 transition-opacity`}
      title={`Message safety: ${safetyLevel}`}
    >
      <Icon size={14} />
    </button>
  );
};

// Unsafe Message Warning Component
export const UnsafeMessageWarning = ({ message, onReport, onIgnore }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Unsafe Message Detected</p>
          <p className="text-gray-400 text-sm">This message may contain malicious content or links.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onReport}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Report
            </button>
            <button
              onClick={onIgnore}
              className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SafeMessage;
