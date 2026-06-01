import React, { useState } from 'react';
import { Smartphone, Monitor, Tablet, Clock, Trash2, Power, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import deviceService from '../services/deviceService';

const DeviceCard = ({ device, onDeviceUpdate, onDeviceRemove }) => {
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'desktop':
      case 'pc':
        return <Monitor className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Smartphone className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleToggleActive = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await deviceService.setDeviceActive(device.id, !device.active);
      onDeviceUpdate && onDeviceUpdate();
    } catch (error) {
      console.error('Error toggling device:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkDevice = async () => {
    if (loading) return;
    
    const confirmed = window.confirm(`Are you sure you want to unlink "${device.name}"? This will remove access from this device.`);
    if (!confirmed) return;
    
    setLoading(true);
    try {
      await deviceService.unlinkDevice(device.id);
      onDeviceRemove && onDeviceRemove();
    } catch (error) {
      console.error('Error unlinking device:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentDevice = device.current || device.id === 'current-device';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`p-2 rounded-lg ${
            device.active 
              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {getDeviceIcon(device.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {device.name || 'Unknown Device'}
              </h3>
              {isCurrentDevice && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                  Current
                </span>
              )}
            </div>
            
            <div className="mt-1 space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>Last active: {formatDate(device.lastActive || device.createdAt)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {device.active ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-gray-400" />
                    <span>Inactive</span>
                  </>
                )}
              </div>
              
              {device.platform && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Platform: {device.platform}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`flex items-center space-x-2 transition-opacity ${
          showActions || !isCurrentDevice ? 'opacity-100' : 'opacity-0'
        }`}>
          {!isCurrentDevice && (
            <>
              <button
                onClick={handleToggleActive}
                disabled={loading}
                className={`p-2 rounded-lg transition-colors ${
                  device.active
                    ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
                    : 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-600 dark:text-green-400'
                }`}
                title={device.active ? 'Deactivate' : 'Activate'}
              >
                <Power className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleUnlinkDevice}
                disabled={loading}
                className="p-2 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 transition-colors"
                title="Unlink Device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Processing...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DeviceCard;
