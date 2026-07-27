import React, { useState, useEffect } from 'react';
import { Clock, Eye, EyeOff, Settings, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LastSeen = ({ user, privacySettings, onPrivacyChange }) => {
  const [lastSeen, setLastSeen] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    // Simulate fetching last seen status
    const fetchLastSeen = async () => {
      // Mock data - in production, fetch from backend
      setLastSeen(user.lastSeen || Date.now() - 1000 * 60 * 15); // 15 minutes ago
      setIsOnline(user.isOnline || false);
    };

    fetchLastSeen();

    // Update online status periodically
    const interval = setInterval(() => {
      setIsOnline(Math.random() > 0.7); // Random online status for demo
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const getPrivacyLabel = () => {
    switch (privacySettings?.lastSeen) {
      case 'everyone':
        return 'Everyone';
      case 'contacts':
        return 'My contacts';
      case 'nobody':
        return 'Nobody';
      default:
        return 'Everyone';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00a884] rounded-full animate-pulse" />
          <span className="text-[#00a884] text-xs">Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-gray-400" />
          <span className="text-gray-400 text-xs">
            {privacySettings?.lastSeen === 'nobody' 
              ? 'Last seen hidden' 
              : `Last seen ${formatLastSeen(lastSeen)}`}
          </span>
        </div>
      )}

      <button
        onClick={() => setShowPrivacyModal(!showPrivacyModal)}
        className="text-gray-400 hover:text-[#00a884] transition-colors"
        title="Privacy settings"
      >
        <Settings size={14} />
      </button>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 z-50 w-64"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium">Last Seen Privacy</h4>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onPrivacyChange('lastSeen', 'everyone');
                    setShowPrivacyModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    privacySettings?.lastSeen === 'everyone'
                      ? 'bg-[#00a884]/20 text-[#00a884]'
                      : 'text-gray-300 hover:bg-[#00a884]/10'
                  }`}
                >
                  <span className="text-sm">Everyone</span>
                  {privacySettings?.lastSeen === 'everyone' && <Check size={16} />}
                </button>

                <button
                  onClick={() => {
                    onPrivacyChange('lastSeen', 'contacts');
                    setShowPrivacyModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    privacySettings?.lastSeen === 'contacts'
                      ? 'bg-[#00a884]/20 text-[#00a884]'
                      : 'text-gray-300 hover:bg-[#00a884]/10'
                  }`}
                >
                  <span className="text-sm">My contacts</span>
                  {privacySettings?.lastSeen === 'contacts' && <Check size={16} />}
                </button>

                <button
                  onClick={() => {
                    onPrivacyChange('lastSeen', 'nobody');
                    setShowPrivacyModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    privacySettings?.lastSeen === 'nobody'
                      ? 'bg-[#00a884]/20 text-[#00a884]'
                      : 'text-gray-300 hover:bg-[#00a884]/10'
                  }`}
                >
                  <span className="text-sm">Nobody</span>
                  {privacySettings?.lastSeen === 'nobody' && <Check size={16} />}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-[#00a884]/20">
                <p className="text-gray-500 text-xs">
                  Current: {getPrivacyLabel()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Online Status Component
export const OnlineStatus = ({ users, currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Filter online users
    const online = users.filter(user => user.isOnline && user._id !== currentUser._id);
    setOnlineUsers(online);
  }, [users, currentUser._id]);

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-[#00a884] rounded-full animate-pulse" />
      <span className="text-gray-400 text-xs">
        {onlineUsers.length} online
      </span>
    </div>
  );
};

// Last Seen Settings Component
export const LastSeenSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Clock size={18} className="text-[#00a884]" />
            Last Seen
          </p>
          <p className="text-gray-400 text-sm">Control who can see when you were last online</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, lastSeenEnabled: !settings.lastSeenEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.lastSeenEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.lastSeenEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.lastSeenEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Who can see my last seen</p>
            <div className="space-y-2">
              <button
                onClick={() => onUpdate({ ...settings, lastSeenPrivacy: 'everyone' })}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  settings.lastSeenPrivacy === 'everyone'
                    ? 'bg-[#00a884]/20 text-[#00a884]'
                    : 'text-gray-300 hover:bg-[#00a884]/10'
                }`}
              >
                <span className="text-sm">Everyone</span>
                {settings.lastSeenPrivacy === 'everyone' && <Check size={16} />}
              </button>

              <button
                onClick={() => onUpdate({ ...settings, lastSeenPrivacy: 'contacts' })}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  settings.lastSeenPrivacy === 'contacts'
                    ? 'bg-[#00a884]/20 text-[#00a884]'
                    : 'text-gray-300 hover:bg-[#00a884]/10'
                }`}
              >
                <span className="text-sm">My contacts only</span>
                {settings.lastSeenPrivacy === 'contacts' && <Check size={16} />}
              </button>

              <button
                onClick={() => onUpdate({ ...settings, lastSeenPrivacy: 'nobody' })}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  settings.lastSeenPrivacy === 'nobody'
                    ? 'bg-[#00a884]/20 text-[#00a884]'
                    : 'text-gray-300 hover:bg-[#00a884]/10'
                }`}
              >
                <span className="text-sm">Nobody</span>
                {settings.lastSeenPrivacy === 'nobody' && <Check size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show online status</p>
              <p className="text-gray-400 text-xs">Let others see when you're online</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showOnlineStatus: !settings.showOnlineStatus })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showOnlineStatus ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showOnlineStatus ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Last Seen History Component
export const LastSeenHistory = ({ userId, history }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Clock size={20} className="text-[#00a884]" />
        Last Seen History
      </h3>

      <div className="space-y-2">
        {history.map((entry, index) => (
          <div key={index} className="bg-[#0b141a] rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${entry.online ? 'bg-[#00a884]' : 'bg-gray-500'}`} />
              <div>
                <p className="text-white text-sm">{entry.online ? 'Online' : 'Offline'}</p>
                <p className="text-gray-400 text-xs">{entry.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Clock className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No history available</p>
        </div>
      )}
    </div>
  );
};

export default LastSeen;
