import React, { useState } from 'react';
import { BellOff, X, Check, AlertTriangle, RefreshCw, Smartphone, MessageSquare, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MuteUnknown = ({ settings, onUpdate, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
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
          <div className="flex items-center gap-2">
            <VolumeX className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Mute Unknown</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Auto-mute unknown numbers</p>
              <p className="text-gray-400 text-sm">Silence contacts not in your list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, muteUnknownEnabled: !settings.muteUnknownEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.muteUnknownEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.muteUnknownEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.muteUnknownEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
              {/* Mute Type */}
              <div>
                <p className="text-white text-sm mb-2">Mute when</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.muteOnMessage || false}
                      onChange={(e) => onUpdate({ ...settings, muteOnMessage: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">They send a message</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.muteOnCall || false}
                      onChange={(e) => onUpdate({ ...settings, muteOnCall: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">They call you</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mute Duration */}
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

              {/* Allow Exceptions */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Allow exceptions</p>
                  <p className="text-gray-400 text-xs">Add to contacts first</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, allowMuteExceptions: !settings.allowMuteExceptions })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.allowMuteExceptions ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.allowMuteExceptions ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <BellOff className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-blue-500 text-xs">
                Auto-muting unknown numbers helps reduce unwanted notifications while still allowing you to check messages.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isSaving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Mute Unknown Settings Component
export const MuteUnknownSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <VolumeX size={18} className="text-[#00a884]" />
            Mute Unknown
          </p>
          <p className="text-gray-400 text-sm">Auto-mute strangers</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, muteUnknownEnabled: !settings.muteUnknownEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.muteUnknownEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.muteUnknownEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.muteUnknownEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show muted indicator</p>
              <p className="text-gray-400 text-xs">Display mute status</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showMutedIndicator: !settings.showMutedIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showMutedIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showMutedIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Notify when unmuted</p>
              <p className="text-gray-400 text-xs">Alert on unmute</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, notifyOnUnmute: !settings.notifyOnUnmute })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.notifyOnUnmute ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.notifyOnUnmute ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Mute Unknown Button Component
export const MuteUnknownButton = ({ onOpen, mutedCount }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Mute unknown"
    >
      <VolumeX size={18} />
      {mutedCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {mutedCount}
        </span>
      )}
    </button>
  );
};

// Muted Contact Alert Component
export const MutedContactAlert = ({ contact, onUnmute }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <BellOff size={20} className="text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Contact Muted</p>
          <p className="text-gray-400 text-sm">{contact.name || contact.phone}</p>
          <p className="text-gray-500 text-xs mt-1">Auto-muted as unknown number</p>
        </div>
        <button
          onClick={() => onUnmute?.(contact._id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// Mute Status Indicator Component
export const MuteStatusIndicator = ({ isMuted, muteUntil }) => {
  if (!isMuted) return null;

  const getMuteText = () => {
    if (muteUntil === null) return 'Muted';
    const remaining = muteUntil - Date.now();
    if (remaining <= 0) return 'Mute expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `Muted ${days}d`;
    return `Muted ${hours}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500 rounded-full px-3 py-1"
    >
      <BellOff size={14} className="text-yellow-500" />
      <span className="text-white text-xs">{getMuteText()}</span>
    </motion.div>
  );
};

export default MuteUnknown;
