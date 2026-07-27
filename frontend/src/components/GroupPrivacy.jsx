import React, { useState } from 'react';
import { Lock, LockOpen, Globe, Shield, Users, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupPrivacy = ({ group, onUpdate, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    privacy: group?.privacy || 'private', // private, public, invite
    whoCanAdd: group?.whoCanAdd || 'admin', // admin, all
    whoCanSend: group?.whoCanSend || 'all', // all, admin
    requireApproval: group?.requireApproval || false,
  });

  const privacyOptions = [
    { id: 'private', label: 'Private', icon: Lock, description: 'Only invited members can join' },
    { id: 'public', label: 'Public', icon: Globe, description: 'Anyone with link can join' },
    { id: 'invite', label: 'Invite Only', icon: Shield, description: 'Invite link required' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onUpdate) {
      onUpdate({
        ...group,
        ...privacySettings
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Group Privacy</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Privacy Type */}
        <div className="mb-6">
          <p className="text-white font-medium mb-3">Group privacy</p>
          <div className="space-y-2">
            {privacyOptions.map(option => {
              const Icon = option.icon;
              const isSelected = privacySettings.privacy === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setPrivacySettings({ ...privacySettings, privacy: option.id })}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <Icon size={20} className={isSelected ? 'text-[#00a884]' : 'text-gray-400'} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{option.label}</p>
                    <p className="text-gray-400 text-sm">{option.description}</p>
                  </div>
                  {isSelected && <Check size={18} className="text-[#00a884]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Who Can Add Members */}
        <div className="mb-6">
          <p className="text-white font-medium mb-3">Who can add members</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'admin', label: 'Admins only' },
              { id: 'all', label: 'All members' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setPrivacySettings({ ...privacySettings, whoCanAdd: option.id })}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  privacySettings.whoCanAdd === option.id
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <span className="text-white text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Who Can Send Messages */}
        <div className="mb-6">
          <p className="text-white font-medium mb-3">Who can send messages</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'admin', label: 'Admins only' },
              { id: 'all', label: 'All members' },
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setPrivacySettings({ ...privacySettings, whoCanSend: option.id })}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  privacySettings.whoCanSend === option.id
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <span className="text-white text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Require Approval */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
            <div>
              <p className="text-white font-medium">Require approval</p>
              <p className="text-gray-400 text-sm">Admin must approve new members</p>
            </div>
            <button
              onClick={() => setPrivacySettings({ ...privacySettings, requireApproval: !privacySettings.requireApproval })}
              className={`w-12 h-6 rounded-full transition-all ${
                privacySettings.requireApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  privacySettings.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-yellow-500 text-xs">
              Changing privacy settings may affect how members interact with the group.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Privacy Badge Component
export const PrivacyBadge = ({ privacy }) => {
  const configs = {
    private: { icon: Lock, color: 'text-[#00a884]', label: 'Private' },
    public: { icon: Globe, color: 'text-blue-500', label: 'Public' },
    invite: { icon: Shield, color: 'text-purple-500', label: 'Invite Only' },
  };

  const config = configs[privacy] || configs.private;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs ${config.color}`}
    >
      <Icon size={10} />
      <span>{config.label}</span>
    </motion.div>
  );
};

// Privacy Settings Button Component
export const PrivacySettingsButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Privacy settings"
    >
      <Lock size={18} />
    </button>
  );
};

export default GroupPrivacy;
