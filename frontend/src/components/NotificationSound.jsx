import React, { useState } from 'react';
import { Volume2, X, Check, Play, Pause, RefreshCw, Bell, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationSound = ({ currentSound, sounds, onSelect, onUpload, onClose }) => {
  const [selectedSound, setSelectedSound] = useState(currentSound || 'default');
  const [isPlaying, setIsPlaying] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const defaultSounds = [
    { id: 'default', name: 'Default', icon: Bell },
    { id: 'chime', name: 'Chime', icon: Music },
    { id: 'pop', name: 'Pop', icon: Bell },
    { id: 'ding', name: 'Ding', icon: Bell },
    { id: 'notification', name: 'Notification', icon: Bell },
    { id: 'whatsapp', name: 'WhatsApp', icon: Music },
    { id: 'gentle', name: 'Gentle', icon: Music },
    { id: 'alert', name: 'Alert', icon: Bell },
  ];

  const handleSelect = (soundId) => {
    setSelectedSound(soundId);
    if (onSelect) {
      onSelect(soundId);
    }
  };

  const handlePlayPreview = (soundId) => {
    setIsPlaying(soundId);
    setTimeout(() => setIsPlaying(null), 2000);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsUploading(false);
    if (onUpload) {
      onUpload();
    }
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
          <div className="flex items-center gap-2">
            <Volume2 className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Notification Sound</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sound Options */}
        <div className="space-y-2 mb-4">
          {defaultSounds.map(sound => {
            const SoundIcon = sound.icon;
            return (
              <button
                key={sound.id}
                onClick={() => handleSelect(sound.id)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center justify-between ${
                  selectedSound === sound.id
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <SoundIcon size={18} className="text-gray-400" />
                  <span className="text-white">{sound.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(sound.id);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isPlaying === sound.id ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  {selectedSound === sound.id && <Check size={18} className="text-[#00a884]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Upload Custom Sound */}
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#00a884]/30 mb-4"
        >
          {isUploading ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Uploading...
            </>
          ) : (
            <>
              <Music size={18} />
              Upload Custom Sound
            </>
          )}
        </button>

        {/* Volume Control */}
        <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={16} className="text-gray-400" />
            <span className="text-white text-sm">Volume</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="80"
            className="w-full accent-[#00a884]"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Notification Sound Settings Component
export const NotificationSoundSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Volume2 size={18} className="text-[#00a884]" />
            Notification Sound
          </p>
          <p className="text-gray-400 text-sm">Customize sounds</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, notificationSoundEnabled: !settings.notificationSoundEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.notificationSoundEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.notificationSoundEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.notificationSoundEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Message sound</p>
            <select
              value={settings.messageSound || 'default'}
              onChange={(e) => onUpdate({ ...settings, messageSound: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="chime">Chime</option>
              <option value="pop">Pop</option>
              <option value="ding">Ding</option>
              <option value="silent">Silent</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Call ringtone</p>
            <select
              value={settings.callRingtone || 'default'}
              onChange={(e) => onUpdate({ ...settings, callRingtone: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="gentle">Gentle</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Different sounds for groups</p>
              <p className="text-gray-400 text-xs">Use unique sounds for groups</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, groupSoundDifferent: !settings.groupSoundDifferent })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.groupSoundDifferent ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.groupSoundDifferent ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibrate with sound</p>
              <p className="text-gray-400 text-xs">Vibrate on notification</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, vibrateWithSound: !settings.vibrateWithSound })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.vibrateWithSound ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.vibrateWithSound ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sound Button Component
export const SoundButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Notification sound"
    >
      <Volume2 size={18} />
    </button>
  );
};

// Sound Volume Slider Component
export const SoundVolumeSlider = ({ volume, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <Volume2 size={16} className="text-gray-400" />
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 accent-[#00a884]"
      />
      <span className="text-gray-400 text-xs w-8">{volume}%</span>
    </div>
  );
};

// Mute Toggle Component
export const MuteToggle = ({ isMuted, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full transition-colors ${
        isMuted
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-gray-400 hover:text-white'
      }`}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <Volume2 size={18} /> : <Bell size={18} />}
    </button>
  );
};

export default NotificationSound;
