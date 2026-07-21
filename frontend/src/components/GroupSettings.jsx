import React, { useState } from 'react';
import { Settings, X, Lock, Edit, Bell, Users, Shield, Archive, Trash2, RefreshCw, Check, Globe, LockOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupSettings = ({ group, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onUpdate) {
      onUpdate({
        ...group,
        ...formData
      });
    }
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Settings size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Group Settings</h2>
              <p className="text-gray-400 text-sm">{group?.name || 'Group'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium">Group name</p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[#00a884] hover:text-[#008f72] transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                </button>
              </div>
            ) : (
              <p className="text-gray-300">{group?.name || 'Group name'}</p>
            )}
          </div>

          {/* Group Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-medium">Description</p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[#00a884] hover:text-[#008f72] transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                rows={3}
              />
            ) : (
              <p className="text-gray-300">{group?.description || 'No description'}</p>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <p className="text-white font-medium mb-3 flex items-center gap-2">
              <Lock size={18} className="text-[#00a884]" />
              Privacy
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Who can send messages</p>
                  <p className="text-gray-400 text-xs">All participants</p>
                </div>
 <Globe size={16} className="text-gray-400" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Who can add participants</p>
                  <p className="text-gray-400 text-xs">All admins</p>
                </div>
                <Shield size={16} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <p className="text-white font-medium mb-3 flex items-center gap-2">
              <Bell size={18} className="text-[#00a884]" />
              Notifications
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Mute notifications</p>
                  <p className="text-gray-400 text-xs">Silence group messages</p>
                </div>
                <button className={`w-12 h-6 rounded-full transition-all ${group?.isMuted ? 'bg-[#00a884]' : 'bg-[#0b141a]'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${group?.isMuted ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Group Info */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <p className="text-white font-medium mb-3 flex items-center gap-2">
              <Users size={18} className="text-[#00a884]" />
              Group Info
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Created by</p>
                <p className="text-white text-sm">{group?.createdBy || 'Unknown'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Created on</p>
                <p className="text-white text-sm">{group?.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">Members</p>
                <p className="text-white text-sm">{group?.memberCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-500 font-medium mb-3">Danger Zone</p>
            <div className="space-y-2">
              <button className="w-full p-3 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2">
                <Archive size={16} />
                Archive Group
              </button>
              <button className="w-full p-3 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Delete Group
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Group Settings Button Component
export const GroupSettingsButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Group settings"
    >
      <Settings size={20} />
    </button>
  );
};

// Group Privacy Settings Component
export const GroupPrivacySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Lock size={18} className="text-[#00a884]" />
            Group Privacy
          </p>
          <p className="text-gray-400 text-sm">Control group access</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, groupPrivacyEnabled: !settings.groupPrivacyEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.groupPrivacyEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.groupPrivacyEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.groupPrivacyEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default privacy</p>
            <select
              value={settings.defaultGroupPrivacy || 'public'}
              onChange={(e) => onUpdate({ ...settings, defaultGroupPrivacy: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="invite">Invite Only</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;
