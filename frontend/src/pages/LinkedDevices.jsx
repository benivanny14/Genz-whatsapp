import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, QrCode, Smartphone, RefreshCw, LogOut, Users, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DeviceCard from '../components/DeviceCard';
import deviceService from '../services/deviceService';

const LinkedDevices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await deviceService.getDevices();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setError('Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      setError(null);
      const data = await deviceService.generateQR();
      setQrData(data);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error generating QR:', error);
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to logout from all devices except this one?')) {
      return;
    }

    try {
      setLoading(true);
      await deviceService.logoutAllDevices();
      await fetchDevices();
    } catch (error) {
      console.error('Error logging out all devices:', error);
      setError('Failed to logout devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceUpdate = () => {
    fetchDevices();
  };

  const handleDeviceRemove = () => {
    fetchDevices();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getQrImageSource = (qr) => {
    if (!qr) return '';
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Linked Devices</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLogoutAll}
                disabled={loading}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 inline mr-1" />
                Logout All
              </button>
              <button
                onClick={fetchDevices}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{devices.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {devices.filter(d => d.active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mobile</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {devices.filter(d => d.type === 'mobile').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Device Button */}
        <button
          onClick={handleGenerateQR}
          disabled={qrLoading}
          className="w-full md:w-auto mb-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <QrCode className="w-5 h-5" />
          <span>{qrLoading ? 'Generating...' : 'Link New Device'}</span>
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Loading devices...</span>
          </div>
        )}

        {/* Devices List */}
        {!loading && (
          <div className="space-y-4">
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No linked devices</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Link your devices to use GENZ WhatsApp on multiple devices
                </p>
                <button
                  onClick={handleGenerateQR}
                  disabled={qrLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Link First Device
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {devices.map((device) => (
                  <DeviceCard
                    key={device.id || device.deviceId || device._id}
                    device={device}
                    onDeviceUpdate={handleDeviceUpdate}
                    onDeviceRemove={handleDeviceRemove}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && qrData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Link New Device</h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="text-center">
                {qrData.qrCode ? (
                  <div className="mb-4">
                    <img
                      src={getQrImageSource(qrData.qrCode)}
                      alt="QR Code"
                      className="w-64 h-64 mx-auto border border-gray-200 dark:border-gray-700 rounded-lg"
                    />
                  </div>
                ) : qrData.qrUrl ? (
                  <div className="mb-4">
                    <img
                      src={qrData.qrUrl}
                      alt="QR Code"
                      className="w-64 h-64 mx-auto border border-gray-200 dark:border-gray-700 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="mb-4 p-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto" />
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scan this QR code with your GENZ WhatsApp mobile app
                  </p>
                  
                  {qrData.code && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Or enter this code:</p>
                      <div className="flex items-center justify-center space-x-2">
                        <code className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                          {qrData.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(qrData.code)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          title="Copy code"
                        >
                          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This QR code will expire in 10 minutes
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleGenerateQR}
                  disabled={qrLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 inline mr-1 ${qrLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LinkedDevices;
