import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Scan, Copy, Download, Share2, RefreshCw, X, Check, Smartphone, Link, User, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QRCodeGenerator = ({ data, type = 'profile', onClose }) => {
  const [qrData, setQrData] = useState('');
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    // Generate QR code data based on type
    if (type === 'profile') {
      setQrData(JSON.stringify({
        type: 'profile',
        userId: data.userId,
        phone: data.phone,
        name: data.name
      }));
    } else if (type === 'group') {
      setQrData(JSON.stringify({
        type: 'group',
        groupId: data.groupId,
        inviteCode: data.inviteCode
      }));
    } else if (type === 'link') {
      setQrData(data.url);
    }
  }, [data, type]);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current;
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-${type}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${type} QR Code`,
          text: qrData
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const handleRefresh = () => {
    // Regenerate QR code with new data
    const newData = { ...data, timestamp: Date.now() };
    if (type === 'profile') {
      setQrData(JSON.stringify({
        type: 'profile',
        userId: newData.userId,
        phone: newData.phone,
        name: newData.name,
        timestamp: newData.timestamp
      }));
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
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <QrCode className="text-[#00a884]" />
            QR Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div ref={qrRef} className="flex justify-center">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Type Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {type === 'profile' && (
            <div className="bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <User size={14} />
              Profile QR
            </div>
          )}
          {type === 'group' && (
            <div className="bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <Link size={14} />
              Group QR
            </div>
          )}
          {type === 'link' && (
            <div className="bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <Link size={14} />
              Link QR
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <Shield size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
            <p className="text-gray-300 text-sm">
              {type === 'profile' && 'Scan this QR code to add me as a contact.'}
              {type === 'group' && 'Scan this QR code to join this group.'}
              {type === 'link' && 'Scan this QR code to open the link.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleCopy}
            className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
          >
            {copied ? <Check size={20} className="text-[#00a884]" /> : <Copy size={20} />}
            <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
          >
            <Download size={20} />
            <span className="text-xs">Save</span>
          </button>
          <button
            onClick={handleShare}
            className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
          >
            <Share2 size={20} />
            <span className="text-xs">Share</span>
          </button>
          <button
            onClick={handleRefresh}
            className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
          >
            <RefreshCw size={20} />
            <span className="text-xs">Refresh</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const QRCodeScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const handleStartScan = () => {
    setScanning(true);
    setError(null);
    
    // Simulate QR code scanning
    setTimeout(() => {
      const mockResult = {
        type: 'profile',
        userId: '123456',
        phone: '+255123456789',
        name: 'John Doe'
      };
      setScanResult(mockResult);
      setScanning(false);
      
      if (onScan) {
        onScan(mockResult);
      }
    }, 2000);
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
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Scan className="text-[#00a884]" />
            Scan QR Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="bg-[#0b141a] rounded-xl p-8 mb-6 relative overflow-hidden">
          {!scanning && !scanResult ? (
            <div className="text-center">
              <div className="w-32 h-32 border-2 border-[#00a884] rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Scan size={48} className="text-[#00a884]" />
              </div>
              <p className="text-gray-400 text-sm mb-4">Point camera at QR code</p>
              <button
                onClick={handleStartScan}
                className="bg-[#00a884] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center gap-2 mx-auto"
              >
                <Smartphone size={20} />
                Start Scanning
              </button>
            </div>
          ) : scanning ? (
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="absolute inset-0 border-2 border-[#00a884] rounded-lg animate-pulse" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#00a884] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
              <p className="text-gray-400 text-sm">Scanning...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-[#00a884]" />
              </div>
              <p className="text-white font-medium mb-2">QR Code Scanned!</p>
              <p className="text-gray-400 text-sm mb-4">
                {scanResult?.type === 'profile' && `Found: ${scanResult.name}`}
                {scanResult?.type === 'group' && 'Found: Group'}
                {scanResult?.type === 'link' && 'Found: Link'}
              </p>
              <button
                onClick={() => {
                  setScanResult(null);
                  handleStartScan();
                }}
                className="text-[#00a884] hover:underline text-sm"
              >
                Scan another
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-[#0b141a] rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Smartphone size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
            <p className="text-gray-300 text-sm">
              Position the QR code within the frame. It will be scanned automatically.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
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
          <p className="text-gray-400 text-sm">Generate and scan QR codes</p>
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
              <p className="text-white text-sm">Show in profile</p>
              <p className="text-gray-400 text-xs">Display QR code on profile</p>
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
              <p className="text-white text-sm">Auto-scan</p>
              <p className="text-gray-400 text-xs">Automatically scan QR codes</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoScanQR: !settings.autoScanQR })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoScanQR ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoScanQR ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { QRCodeGenerator, QRCodeScanner };
export default QRCodeGenerator;
