import React, { useState } from 'react';
import { QrCode, X, Download, Share2, Copy, RefreshCw, Scan, User, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QRCodeSharing = ({ qrData, onGenerate, onShare, onCopy, onClose }) => {
  const [qrType, setQrType] = useState('profile'); // profile, group, contact
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsGenerating(false);
    if (onGenerate) {
      onGenerate(qrType);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSharing(false);
    if (onShare) {
      onShare(qrData);
    }
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(qrData);
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
            <QrCode className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* QR Type Selection */}
        <div className="flex gap-2 mb-4">
          {['profile', 'group', 'contact'].map(type => (
            <button
              key={type}
              onClick={() => setQrType(type)}
              className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${
                qrType === type
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-lg p-6 mb-4 flex items-center justify-center">
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            {qrData ? (
              <QrCode size={160} className="text-gray-800" />
            ) : (
              <div className="text-center">
                <QrCode size={48} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Generate QR Code</p>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        {!qrData && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Generate QR Code
              </>
            )}
          </button>
        )}

        {/* Action Buttons */}
        {qrData && (
          <div className="space-y-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSharing ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  Share QR Code
                </>
              )}
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                Copy
              </button>
              <button
                onClick={() => onGenerate(qrType)}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Scan className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-blue-500 text-xs">
              Others can scan this QR code to connect with you instantly.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// QR Code Scanner Component
export const QRCodeScanner = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScan = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsScanning(false);
    setScanResult('scanned-data');
    if (onScan) {
      onScan('scanned-data');
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
            <Scan className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scanner View */}
        <div className="bg-black rounded-lg p-6 mb-4 flex items-center justify-center relative overflow-hidden">
          {isScanning ? (
            <div className="text-center">
              <motion.div
                animate={{ y: [0, 100, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-48 h-1 bg-[#00a884] mb-4"
              />
              <p className="text-white text-sm">Scanning...</p>
            </div>
          ) : scanResult ? (
            <div className="text-center">
              <Check className="text-[#00a884] mx-auto mb-2" size={48} />
              <p className="text-white text-sm">QR Code Scanned!</p>
            </div>
          ) : (
            <div className="text-center">
              <Scan className="text-gray-600 mx-auto mb-2" size={48} />
              <p className="text-gray-400 text-sm">Point camera at QR code</p>
            </div>
          )}
        </div>

        {/* Scan Button */}
        {!scanResult && (
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
                <Scan size={18} />
                Start Scanning
              </>
            )}
          </button>
        )}

        {scanResult && (
          <button
            onClick={() => {
              setScanResult(null);
              onClose();
            }}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </motion.div>
  );
};

// QR Code Button Component
export const QRCodeButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="QR Code"
    >
      <QrCode size={18} />
    </button>
  );
};

// QR Code Display Component
export const QRCodeDisplay = ({ data, size = 128 }) => {
  return (
    <div className="bg-white rounded-lg p-4 flex items-center justify-center">
      <div
        className="bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <QrCode size={size * 0.8} className="text-gray-800" />
      </div>
    </div>
  );
};

// QR Code Settings Component
export const QRCodeSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <QrCode size={18} className="text-[#00a884]" />
            QR Code
          </p>
          <p className="text-gray-400 text-sm">Quick connection via QR</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, qrCodeEnabled: !settings.qrCodeEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.qrCodeEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.qrCodeEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.qrCodeEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show QR in profile</p>
              <p className="text-gray-400 text-xs">Display on profile page</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showQRInProfile: !settings.showQRInProfile })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showQRInProfile ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showQRInProfile ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-refresh QR</p>
              <p className="text-gray-400 text-xs">Update QR periodically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoRefreshQR: !settings.autoRefreshQR })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoRefreshQR ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoRefreshQR ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick QR Share Component
export const QuickQRShare = ({ onShare }) => {
  return (
    <button
      onClick={onShare}
      className="flex items-center gap-2 bg-[#0b141a] px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <QrCode size={16} className="text-[#00a884]" />
      <span className="text-white text-sm">Share QR Code</span>
    </button>
  );
};

// Contact QR Component
export const ContactQR = ({ contact }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <User size={24} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{contact.name}</h3>
          <p className="text-gray-400 text-sm">{contact.phone}</p>
        </div>
        <QrCode size={24} className="text-[#00a884]" />
      </div>
    </div>
  );
};

export default QRCodeSharing;
