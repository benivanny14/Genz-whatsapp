import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  X, 
  Download, 
  Share2, 
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';

const GroupQRCode = ({ groupId, groupName, onClose }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    generateQRCode();
  }, [groupId]);

  const generateQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      
      // Use a QR code generation library or API
      // For this implementation, we'll use a public QR code API
      const inviteUrl = `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/invite/${groupId}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteUrl)}`;
      
      setQrCode(qrApiUrl);
    } catch (error) {
      setError('Error generating QR code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCode) {
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = `${groupName || 'group'}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const shareQRCode = async () => {
    if (qrCode && navigator.share) {
      try {
        // Convert QR code to blob for sharing
        const response = await fetch(qrCode);
        const blob = await response.blob();
        const file = new File([blob], 'group-qrcode.png', { type: 'image/png' });
        
        await navigator.share({
          title: `Join ${groupName} on GenZ WhatsApp`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing QR code:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white glass-keep-white rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <QrCode className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Group QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {!loading && !error && qrCode && (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-inner">
                  <img
                    src={qrCode}
                    alt="Group QR Code"
                    className="w-64 h-64"
                  />
                </div>
              </div>

              {/* Group Name */}
              <p className="text-center text-gray-600 font-medium">{groupName || 'Group'}</p>

              {/* Instructions */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  Scan this QR code to join the group
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {navigator.share && (
                  <button
                    onClick={shareQRCode}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                )}
              </div>

              {/* Regenerate */}
              <button
                onClick={generateQRCode}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GroupQRCode;
