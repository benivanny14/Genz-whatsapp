import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, Laptop, Tablet, Trash2, Check, X, RefreshCw } from 'lucide-react';

const DeviceLinking = ({ onLinkDevice, onUnlinkDevice, linkedDevices = [] }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'phone': return Smartphone;
      case 'laptop': return Laptop;
      case 'tablet': return Tablet;
      default: return Smartphone;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateQRCode = async () => {
    setIsGenerating(true);
    // Simulate QR code generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setQrCode('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    setIsGenerating(false);
    setShowQRModal(true);

    // Auto-refresh QR code every 30 seconds
    if (refreshInterval) clearInterval(refreshInterval);
    const interval = setInterval(() => {
      setQrCode(`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==${Date.now()}`);
    }, 30000);
    setRefreshInterval(interval);
  };

  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  const handleUnlink = (deviceId) => {
    onUnlinkDevice?.(deviceId);
  };

  return (
    <div className="space-y-4">
      {/* Linked Devices List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Linked Devices</h3>
          <button
            onClick={generateQRCode}
            className="flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition-colors text-sm font-medium"
          >
            <QrCode size={16} />
            Link New Device
          </button>
        </div>

        {linkedDevices.length === 0 ? (
          <div className="bg-[#202c33] rounded-lg p-8 text-center">
            <Smartphone size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">No devices linked yet</p>
            <p className="text-sm text-gray-500 mt-2">Click "Link New Device" to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedDevices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.type);
              return (
                <div
                  key={device.id}
                  className={`bg-[#202c33] rounded-lg p-4 flex items-center gap-4 ${
                    device.isActive ? 'border border-[#00a884]/30' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    device.isActive ? 'bg-[#00a884]/20' : 'bg-gray-600/20'
                  }`}>
                    <DeviceIcon size={20} className={device.isActive ? 'text-[#00a884]' : 'text-gray-400'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{device.name}</span>
                      {device.isActive && (
                        <span className="px-2 py-0.5 bg-[#00a884]/20 text-[#00a884] text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Last active: {formatDate(device.lastActive)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnlink(device.id)}
                    className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                    title="Unlink device"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-[#233138] rounded-2xl p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Link New Device</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="text-center">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw size={32} className="animate-spin text-[#00a884] mb-4" />
                  <p className="text-gray-400">Generating QR code...</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code" 
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Scan this QR code with your device's camera
                  </p>
                  <p className="text-xs text-gray-500">
                    QR code refreshes every 30 seconds for security
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={generateQRCode}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#202c33] hover:bg-[#37404a] text-white rounded-lg transition-colors text-sm font-medium"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition-colors text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceLinking;