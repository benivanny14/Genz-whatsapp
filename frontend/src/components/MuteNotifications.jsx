import React, { useState } from 'react';
import { Bell, BellOff, Clock, X, Check, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MuteNotifications = ({ chat, onMute, onUnmute, onClose }) => {
  const [muteDuration, setMuteDuration] = useState('8hours');
  const [showMuteOptions, setShowMuteOptions] = useState(false);

  const durations = [
    { value: '1hour', label: '1 hour', hours: 1 },
    { value: '8hours', label: '8 hours', hours: 8 },
    { value: '1day', label: '1 day', hours: 24 },
    { value: '1week', label: '1 week', hours: 168 },
    { value: 'forever', label: 'Always', hours: Infinity },
  ];

  const handleMute = () => {
    const duration = durations.find(d => d.value === muteDuration);
    const muteUntil = duration.hours === Infinity ? null : Date.now() + (duration.hours * 60 * 60 * 1000);
    
    if (onMute) {
      onMute(chat._id, {
        muted: true,
        muteUntil: muteUntil,
        muteDuration: muteDuration
      });
    }
    
    setShowMuteOptions(false);
    onClose();
  };

  const handleUnmute = () => {
    if (onUnmute) {
      onUnmute(chat._id);
    }
  };

  const getMuteStatus = () => {
    if (!chat.isMuted) return null;
    
    if (chat.muteUntil === null) return 'Muted forever';
    
    const now = Date.now();
    const remaining = chat.muteUntil - now;
    
    if (remaining <= 0) return 'Mute expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Muted for ${days} days`;
    return `Muted for ${hours} hours`;
  };

  return (
    <>
      <button
        onClick={() => chat.isMuted ? handleUnmute() : setShowMuteOptions(!showMuteOptions)}
        className={`p-2 rounded-lg transition-all ${
          chat.isMuted
            ? 'bg-[#00a884]/20 text-[#00a884]'
            : 'text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10'
        }`}
        title={chat.isMuted ? 'Unmute' : 'Mute notifications'}
      >
        {chat.isMuted ? <BellOff size={20} /> : <Bell size={20} />}
      </button>

      <AnimatePresence>
        {showMuteOptions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 z-50 w-64"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <BellOff size={18} className="text-[#00a884]" />
                  Mute Notifications
                </h4>
                <button
                  onClick={() => setShowMuteOptions(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {durations.map(duration => (
                  <button
                    key={duration.value}
                    onClick={() => setMuteDuration(duration.value)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      muteDuration === duration.value
                        ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]'
                        : 'text-gray-300 hover:bg-[#00a884]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{duration.label}</span>
                      {muteDuration === duration.value && <Check size={16} />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleMute}
                className="w-full mt-4 bg-[#00a884] text-white py-2 rounded-lg font-medium hover:bg-[#008f72] transition-colors text-sm"
              >
                Mute
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Mute Settings Component
export const MuteSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Bell size={18} className="text-[#00a884]" />
            Notifications
          </p>
          <p className="text-gray-400 text-sm">Manage notification preferences</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.notificationsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.notificationsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Message notifications</p>
              <p className="text-gray-400 text-xs">Show message previews</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, messageNotifications: !settings.messageNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.messageNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.messageNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Group notifications</p>
              <p className="text-gray-400 text-xs">Notify for group messages</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, groupNotifications: !settings.groupNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.groupNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.groupNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sound</p>
              <p className="text-gray-400 text-xs">Play notification sound</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, notificationSound: !settings.notificationSound })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.notificationSound ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.notificationSound ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibration</p>
              <p className="text-gray-400 text-xs">Vibrate on notification</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, notificationVibration: !settings.notificationVibration })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.notificationVibration ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.notificationVibration ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default mute duration</p>
            <select
              value={settings.defaultMuteDuration || '8hours'}
              onChange={(e) => onUpdate({ ...settings, defaultMuteDuration: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1hour">1 hour</option>
              <option value="8hours">8 hours</option>
              <option value="1day">1 day</option>
              <option value="1week">1 week</option>
              <option value="forever">Forever</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Muted Chats List Component
export const MutedChatsList = ({ mutedChats, onUnmute }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <BellOff size={20} className="text-[#00a884]" />
        Muted Chats ({mutedChats.length})
      </h3>

      <div className="space-y-2">
        {mutedChats.map(chat => (
          <motion.div
            key={chat._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <BellOff size={18} className="text-[#00a884]" />
              </div>
              <div>
                <p className="text-white font-medium">{chat.name}</p>
                <p className="text-gray-400 text-xs">{chat.muteStatus}</p>
              </div>
            </div>
            <button
              onClick={() => onUnmute(chat._id)}
              className="text-[#00a884] hover:text-white transition-colors"
            >
              Unmute
            </button>
          </motion.div>
        ))}
      </div>

      {mutedChats.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Bell className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No muted chats</p>
        </div>
      )}
    </div>
  );
};

// Custom Mute Duration Component
export const CustomMuteDuration = ({ onMute, onClose }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const handleCustomMute = () => {
    const totalMinutes = (hours * 60) + minutes;
    const muteUntil = Date.now() + (totalMinutes * 60 * 1000);
    
    if (onMute) {
      onMute({
        muted: true,
        muteUntil: muteUntil,
        muteDuration: 'custom'
      });
    }
    
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Clock className="text-[#00a884]" />
            Custom Mute Duration
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Hours</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max="24"
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Minutes</label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              min="0"
              max="59"
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div className="bg-[#0b141a] rounded-lg p-3">
            <p className="text-gray-400 text-xs">Total duration</p>
            <p className="text-white font-medium">
              {hours > 0 && `${hours} hour${hours > 1 ? 's' : ''} `}
              {minutes > 0 && `${minutes} minute${minutes > 1 ? 's' : ''}`}
              {hours === 0 && minutes === 0 && '0 minutes'}
            </p>
          </div>

          <button
            onClick={handleCustomMute}
            disabled={hours === 0 && minutes === 0}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Mute
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MuteNotifications;
