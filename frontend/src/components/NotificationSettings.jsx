import React, { useState, useEffect } from 'react';
import { Bell, Vibrate, Volume2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import notificationService, { getNotificationSettings, updateNotificationSetting } from '../services/notificationService';

const NotificationSettings = () => {
  const [settings, setSettings] = useState(getNotificationSettings());
  const [permission, setPermission] = useState('default');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  };

  const requestPermission = async () => {
    const result = await notificationService.requestNotificationPermission();
    setPermission(result);
  };

  const toggleSetting = async (key) => {
    const newSettings = updateNotificationSetting(key, !settings[key]);
    setSettings(newSettings);
  };

  const testVibration = () => {
    setTesting(true);
    notificationService.vibrate([100, 50, 100]);
    setTimeout(() => setTesting(false), 300);
  };

  const testNotification = async () => {
    await notificationService.showNotification(
      'Test Notification',
      'This is a test notification from GENZ WhatsApp',
      { force: true }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#00a884]/20 rounded-lg">
          <Bell size={20} className="text-[#00a884]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <p className="text-sm text-gray-400">Manage your notification preferences</p>
        </div>
      </div>

      {/* Permission Status */}
      <div className="bg-[#202c33] rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">Notification Permission</p>
          <p className="text-sm text-gray-400">
            {permission === 'granted' && 'Notifications are enabled'}
            {permission === 'denied' && 'Notifications are blocked'}
            {permission === 'default' && 'Permission not requested yet'}
            {permission === 'unsupported' && 'Notifications not supported'}
          </p>
        </div>
        {permission !== 'granted' && permission !== 'unsupported' && (
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Enable
          </button>
        )}
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        {/* Enable/Disable Notifications */}
        <div className="bg-[#202c33] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-white">Notifications</p>
              <p className="text-sm text-gray-400">Show notifications for new messages</p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('enabled')}
            className="p-1 rounded-lg transition-colors"
          >
            {settings.enabled ? (
              <ToggleRight size={32} className="text-[#00a884]" />
            ) : (
              <ToggleLeft size={32} className="text-gray-500" />
            )}
          </button>
        </div>

        {/* Vibration */}
        <div className="bg-[#202c33] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-white">Vibration</p>
              <p className="text-sm text-gray-400">Vibrate on new messages and calls</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={testVibration}
              disabled={testing}
              className="px-3 py-1 bg-[#202c33] hover:bg-[#37404a] text-white rounded-lg transition-colors text-sm"
            >
              {testing ? 'Testing...' : 'Test'}
            </button>
            <button
              onClick={() => toggleSetting('vibration')}
              className="p-1 rounded-lg transition-colors"
            >
              {settings.vibration ? (
                <ToggleRight size={32} className="text-[#00a884]" />
              ) : (
                <ToggleLeft size={32} className="text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Sound */}
        <div className="bg-[#202c33] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-white">Sound</p>
              <p className="text-sm text-gray-400">Play sound for notifications</p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('sound')}
            className="p-1 rounded-lg transition-colors"
          >
            {settings.sound ? (
              <ToggleRight size={32} className="text-[#00a884]" />
            ) : (
              <ToggleLeft size={32} className="text-gray-500" />
            )}
          </button>
        </div>

        {/* Show Preview */}
        <div className="bg-[#202c33] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-white">Message Preview</p>
              <p className="text-sm text-gray-400">Show message content in notifications</p>
            </div>
          </div>
          <button
            onClick={() => toggleSetting('showPreview')}
            className="p-1 rounded-lg transition-colors"
          >
            {settings.showPreview ? (
              <ToggleRight size={32} className="text-[#00a884]" />
            ) : (
              <ToggleLeft size={32} className="text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="flex gap-3">
        <button
          onClick={testNotification}
          className="flex-1 px-4 py-3 bg-[#202c33] hover:bg-[#37404a] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Bell size={16} />
          Test Notification
        </button>
        <button
          onClick={testVibration}
          className="flex-1 px-4 py-3 bg-[#202c33] hover:bg-[#37404a] text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Vibrate size={16} />
          Test Vibration
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Notifications will work even when the app is closed if you have granted permission. 
          Vibration only works on devices that support it (mostly mobile devices).
        </p>
      </div>
    </div>
  );
};

export default NotificationSettings;