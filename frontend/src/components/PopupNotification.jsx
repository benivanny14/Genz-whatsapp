import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Check, RefreshCw, Bell, AlertCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PopupNotification = ({ notification, onAction, onDismiss, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (action) => {
    setActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setActionLoading(false);
    setIsVisible(false);
    if (onAction) {
      onAction(notification._id, action);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          className="fixed top-4 right-4 z-50 w-80"
        >
          <div className="bg-[#1a2e35] rounded-2xl shadow-2xl border border-[#00a884]/30 overflow-hidden">
            {/* Header */}
            <div className="bg-[#0b141a] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                  <Bell size={18} className="text-[#00a884]" />
                </div>
                <div>
                  <p className="text-white font-medium">{notification.sender}</p>
                  <p className="text-gray-400 text-xs">{notification.time}</p>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-white text-sm mb-3">{notification.message}</p>
              
              {notification.type === 'message' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('reply')}
                    disabled={actionLoading}
                    className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="animate-spin inline mr-1" size={14} />
                        Reply
                      </>
                    ) : (
                      'Reply'
                    )}
                  </button>
                  <button
                    onClick={() => handleAction('mark_read')}
                    disabled={actionLoading}
                    className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                  >
                    Mark Read
                  </button>
                </div>
              )}

              {notification.type === 'call' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading}
                    className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction('decline')}
                    disabled={actionLoading}
                    className="flex-1 bg-red-500/20 text-red-500 py-2 rounded-lg hover:bg-red-500/30 transition-colors disabled:bg-red-500/10 disabled:text-red-500/50 disabled:cursor-not-allowed text-sm"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Popup Notification Settings Component
export const PopupNotificationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <MessageSquare size={18} className="text-[#00a884]" />
            Popup Notifications
          </p>
          <p className="text-gray-400 text-sm">Show popup alerts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, popupEnabled: !settings.popupEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.popupEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.popupEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.popupEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show when screen is on</p>
              <p className="text-gray-400 text-xs">Display while using app</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, popupWhenScreenOn: !settings.popupWhenScreenOn })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.popupWhenScreenOn ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.popupWhenScreenOn ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show sender photo</p>
              <p className="text-gray-400 text-xs">Display profile picture</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showSenderPhoto: !settings.showSenderPhoto })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showSenderPhoto ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showSenderPhoto ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show message preview</p>
              <p className="text-gray-400 text-xs">Display message content</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showMessagePreview: !settings.showMessagePreview })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showMessagePreview ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showMessagePreview ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Popup duration</p>
            <select
              value={settings.popupDuration || '5'}
              onChange={(e) => onUpdate({ ...settings, popupDuration: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="3">3 seconds</option>
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Notification Queue Component
export const NotificationQueue = ({ notifications, onAction, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification._id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            style={{ zIndex: 100 - index }}
          >
            <PopupNotification
              notification={notification}
              onAction={onAction}
              onDismiss={onDismiss}
              onClose={() => onDismiss(notification._id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Notification Permission Request Component
export const NotificationPermissionRequest = ({ onRequest, onDismiss }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (onRequest) {
        onRequest(permission === 'granted');
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
    setIsRequesting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell size={18} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Enable Notifications</p>
          <p className="text-gray-400 text-sm mb-3">
            Get notified when you receive new messages and calls
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRequest}
              disabled={isRequesting}
              className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="animate-spin inline mr-1" size={14} />
                  Requesting...
                </>
              ) : (
                'Enable'
              )}
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Notification Preview Component
export const NotificationPreview = ({ notification }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <User size={18} className="text-[#00a884]" />
        </div>
        <div>
          <p className="text-white font-medium">{notification.sender}</p>
          <p className="text-gray-400 text-xs">{notification.time}</p>
        </div>
      </div>
      <p className="text-gray-300 text-sm">{notification.message}</p>
    </div>
  );
};

export default PopupNotification;
