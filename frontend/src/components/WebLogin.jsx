import React, { useState } from 'react';
import { Monitor, X, Check, RefreshCw, QrCode, Smartphone, AlertTriangle, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WebLogin = ({ user, onGenerateQR, onVerifyLogin, onClose }) => {
  const [qrCode, setQrCode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateQR = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGenerating(false);

    // Simulate QR code generation
    const mockQRCode = `https://web.whatsapp.com/qr/${user?._id || 'user123'}`;
    setQrCode(mockQRCode);

    if (onGenerateQR) {
      onGenerateQR(mockQRCode);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(loginCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    setIsVerified(true);
    if (onVerifyLogin) {
      onVerifyLogin(user._id);
    }
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
            <Monitor className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Link Web Device</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!qrCode ? (
          <>
            {/* Instructions */}
            <div className="mb-6">
              <p className="text-white mb-2">To link your web browser:</p>
              <ol className="text-gray-400 text-sm space-y-2 list-decimal ml-4">
                <li>Open WhatsApp Web on your computer</li>
                <li>Click "Link a device" on your phone</li>
                <li>Scan the QR code displayed</li>
              </ol>
            </div>

            {/* Generate QR Button */}
            <button
              onClick={handleGenerateQR}
              disabled={isGenerating}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Generating QR Code...
                </>
              ) : (
                <>
                  <QrCode size={18} />
                  Generate QR Code
                </>
              )}
            </button>
          </>
        ) : !isVerified ? (
          <>
            {/* QR Code Display */}
            <div className="mb-6 flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-4">
                <QrCode size={180} className="text-black" />
              </div>
              <p className="text-gray-400 text-sm text-center">
                Scan this QR code with your WhatsApp app
              </p>
            </div>

            {/* Alternative Login Code */}
            <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <p className="text-gray-400 text-sm mb-2">Or enter this code on your device:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#1a2e35] text-[#00a884] px-3 py-2 rounded text-center font-mono text-lg">
                  {loginCode || 'ABC-DEF-GHI'}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 bg-[#00a884]/20 text-[#00a884] rounded hover:bg-[#00a884]/30 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-yellow-500 text-xs">
                  Only link devices you trust. Linked devices can access your messages.
                </p>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleGenerateQR}
              className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Generate New QR Code
            </button>
          </>
        ) : (
          <>
            {/* Success */}
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-[#00a884]" />
              </div>
              <h4 className="text-white text-xl font-semibold mb-2">Device Linked!</h4>
              <p className="text-gray-400 text-sm">
                Your web browser has been successfully linked to your account.
              </p>
            </div>

            {/* Done Button */}
            <button
              onClick={onClose}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Web Login Button Component
export const WebLoginButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Link web device"
    >
      <Monitor size={18} />
    </button>
  );
};

export default WebLogin;
