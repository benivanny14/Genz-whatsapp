import React, { useState } from 'react';
import { Smartphone, X, Plus, Trash2, LogOut, QrCode, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const DeviceManagement = ({ onClose }) => {
  const { connectedDevices, generateQRCode, pairDevice, logoutDevice, logoutAllDevices, getDevices } = useChat();
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerateQR = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateQRCode({ deviceName: 'New Device' });
      if (result.success) {
        setQrCode(result.qrCode);
        setShowQR(true);
      } else {
        setError(result.message || 'Failed to generate QR code');
      }
    } catch (err) {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to logout this device?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await logoutDevice(deviceId);
      if (result.success) {
        setSuccess('Device logged out successfully');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh devices list
        await getDevices();
      } else {
        setError(result.message || 'Failed to logout device');
      }
    } catch (err) {
      setError('Failed to logout device');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to logout all devices? You will need to re-login on all devices.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await logoutAllDevices();
      if (result.success) {
        setSuccess('All devices logged out successfully');
        setTimeout(() => setSuccess(''), 3000);
        // Refresh devices list
        await getDevices();
      } else {
        setError(result.message || 'Failed to logout all devices');
      }
    } catch (err) {
      setError('Failed to logout all devices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDeviceId = (device) => device?.id || device?.deviceId || device?._id;
  const getQrImageSource = (qr) => {
    if (!qr) return '';
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface rounded-2xl w-full max-w-2xl border border-dark-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold text-dark-text">Linked Devices</h2>
          </div>
          <button onClick={onClose} className="text-dark-textSecondary hover:text-dark-text">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg text-sm mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-lg text-sm mb-4">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {/* Link New Device Button */}
          <button
            onClick={handleGenerateQR}
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
          >
            {loading ? 'Generating...' : <><Plus size={18} /> Link a New Device</>}
          </button>

          {/* QR Code Modal */}
          {showQR && (
            <div className="bg-dark-bg rounded-lg p-6 mb-6 text-center">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-dark-text">Scan QR Code</h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-dark-textSecondary hover:text-dark-text"
                >
                  <X size={20} />
                </button>
              </div>
              {qrCode && (
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={getQrImageSource(qrCode)} alt="QR Code" className="w-64 h-64" />
                </div>
              )}
              <p className="text-sm text-dark-textSecondary mt-4">
                Open GENZ WhatsApp on your other device and scan this QR code to link it
              </p>
            </div>
          )}

          {/* Devices List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-dark-text uppercase">Active Devices</h3>
              <span className="text-xs text-dark-textSecondary">{connectedDevices?.length || 0} devices</span>
            </div>

            {connectedDevices && connectedDevices.length > 0 ? (
              connectedDevices.map((device) => (
                <div
                  key={getDeviceId(device)}
                  className="bg-dark-bg rounded-lg p-4 flex items-center justify-between border border-dark-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600/20 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-text">{device.deviceName || 'Unknown Device'}</p>
                      <p className="text-xs text-dark-textSecondary">
                        {device.platform || 'Web Browser'} • {device.browser || 'Chrome'}
                      </p>
                      <p className="text-xs text-dark-textSecondary">
                        Last active: {device.lastActive ? formatDate(device.lastActive) : 'Active now'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLogoutDevice(getDeviceId(device))}
                    disabled={loading}
                    className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors disabled:opacity-50"
                    title="Logout device"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-dark-bg rounded-lg p-8 text-center border border-dark-border">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-dark-textSecondary" />
                <p className="text-sm text-dark-textSecondary">No linked devices found</p>
                <p className="text-xs text-dark-textSecondary mt-1">Link a device to get started</p>
              </div>
            )}
          </div>

          {/* Logout All Button */}
          {connectedDevices && connectedDevices.length > 1 && (
            <div className="mt-6 pt-4 border-t border-dark-border">
              <button
                onClick={handleLogoutAllDevices}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Logging out...' : <><LogOut size={18} /> Logout All Devices</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceManagement;
