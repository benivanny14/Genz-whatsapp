import React, { useState } from 'react';
import { Shield, X, Ban, Check, AlertTriangle, UserX, RefreshCw, Smartphone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BlockUnknown = ({ settings, onUpdate, onClose }) => {
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
            <Shield className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Block Unknown</h3>
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
              <p className="text-white font-medium">Auto-block unknown numbers</p>
              <p className="text-gray-400 text-sm">Block contacts not in your list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, blockUnknownEnabled: !settings.blockUnknownEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.blockUnknownEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.blockUnknownEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.blockUnknownEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
              {/* Block Type */}
              <div>
                <p className="text-white text-sm mb-2">Block when</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.blockOnMessage || false}
                      onChange={(e) => onUpdate({ ...settings, blockOnMessage: e.target.checked })}
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
                      checked={settings.blockOnCall || false}
                      onChange={(e) => onUpdate({ ...settings, blockOnCall: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-gray-400" />
                      <span className="text-gray-300 text-sm">They call you</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Report Spam */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Auto-report as spam</p>
                  <p className="text-gray-400 text-xs">Report to WhatsApp</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, autoReportSpam: !settings.autoReportSpam })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.autoReportSpam ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.autoReportSpam ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Allow Exceptions */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Allow exceptions</p>
                  <p className="text-gray-400 text-xs">Add to contacts first</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, allowExceptions: !settings.allowExceptions })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.allowExceptions ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.allowExceptions ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-yellow-500 text-xs">
                Auto-blocking unknown numbers may prevent legitimate contacts from reaching you.
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

// Block Unknown Settings Component
export const BlockUnknownSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Block Unknown
          </p>
          <p className="text-gray-400 text-sm">Auto-block strangers</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, blockUnknownEnabled: !settings.blockUnknownEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.blockUnknownEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.blockUnknownEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.blockUnknownEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show blocked count</p>
              <p className="text-gray-400 text-xs">Display total blocked</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showBlockedCount: !settings.showBlockedCount })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showBlockedCount ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showBlockedCount ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Notify when blocked</p>
              <p className="text-gray-400 text-xs">Show notification</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, notifyOnBlock: !settings.notifyOnBlock })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.notifyOnBlock ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.notifyOnBlock ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Block Unknown Button Component
export const BlockUnknownButton = ({ onOpen, blockedCount }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Block unknown"
    >
      <Shield size={18} />
      {blockedCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {blockedCount}
        </span>
      )}
    </button>
  );
};

// Blocked Contact Alert Component
export const BlockedContactAlert = ({ contact, onUnblock }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <UserX size={20} className="text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Contact Blocked</p>
          <p className="text-gray-400 text-sm">{contact.name || contact.phone}</p>
          <p className="text-gray-500 text-xs mt-1">Auto-blocked as unknown number</p>
        </div>
        <button
          onClick={() => onUnblock?.(contact._id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// Unknown Number Warning Component
export const UnknownNumberWarning = ({ number, onBlock, onAddContact }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Unknown Number</p>
          <p className="text-gray-400 text-sm">{number}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAddContact}
              className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
            >
              Add Contact
            </button>
            <button
              onClick={onBlock}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Block
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BlockUnknown;
