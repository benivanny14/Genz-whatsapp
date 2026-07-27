import React, { useState } from 'react';
import { Shield, X, User, Eye, Lock, Check, AlertCircle, ChevronRight, Globe, Users, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AccountPrivacy = ({ privacySettings, onUpdate, onClose }) => {
  const [showSection, setShowSection] = useState(null);

  const privacySections = [
    {
      id: 'profile_photo',
      title: 'Profile Photo',
      icon: User,
      description: 'Who can see your profile photo',
      options: ['Everyone', 'My contacts', 'Nobody'],
      currentValue: privacySettings?.profilePhoto || 'Everyone'
    },
    {
      id: 'about',
      title: 'About',
      icon: User,
      description: 'Who can see your about information',
      options: ['Everyone', 'My contacts', 'Nobody'],
      currentValue: privacySettings?.about || 'Everyone'
    },
    {
      id: 'last_seen',
      title: 'Last Seen & Online',
      icon: Eye,
      description: 'Control when you were last online',
      options: ['Everyone', 'My contacts', 'Nobody'],
      currentValue: privacySettings?.lastSeen || 'Everyone'
    },
    {
      id: 'status',
      title: 'Status',
      icon: Eye,
      description: 'Who can see your status updates',
      options: ['Everyone', 'My contacts', 'My contacts except...', 'Only share with...'],
      currentValue: privacySettings?.status || 'Everyone'
    },
    {
      id: 'profile_photo_privacy',
      title: 'Profile Photo Privacy',
      icon: User,
      description: 'Who can see your profile photo from groups',
      options: ['Everyone', 'My contacts', 'Nobody'],
      currentValue: privacySettings?.profilePhotoPrivacy || 'Everyone'
    },
    {
      id: 'read_receipts',
      title: 'Read Receipts',
      icon: Check,
      description: 'Let others know when you read messages',
      options: ['Enabled', 'Disabled'],
      currentValue: privacySettings?.readReceipts ? 'Enabled' : 'Disabled'
    },
    {
      id: 'groups',
      title: 'Groups',
      icon: Users,
      description: 'Who can add you to groups',
      options: ['Everyone', 'My contacts', 'My contacts except...'],
      currentValue: privacySettings?.groups || 'Everyone'
    },
    {
      id: 'blocked',
      title: 'Blocked Contacts',
      icon: UserMinus,
      description: 'Manage your blocked contacts',
      options: [],
      currentValue: privacySettings?.blockedCount || 0
    }
  ];

  const handleSectionClick = (sectionId) => {
    setShowSection(sectionId);
  };

  const handleOptionSelect = (sectionId, option) => {
    const section = privacySections.find(s => s.id === sectionId);
    if (section) {
      const key = section.id;
      const value = option === 'Enabled' ? true : option === 'Disabled' ? false : option;
      onUpdate({ ...privacySettings, [key]: value });
      setShowSection(null);
    }
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
              <Shield size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Account Privacy</h2>
              <p className="text-gray-400 text-sm">Control your privacy settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Privacy Sections */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {privacySections.map(section => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className="w-full bg-[#0b141a] rounded-lg p-4 flex items-center gap-3 hover:bg-[#1a2e35] transition-colors"
              >
                <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                  <section.icon size={18} className="text-[#00a884]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">{section.title}</p>
                  <p className="text-gray-400 text-sm">{section.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{section.currentValue}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section Details Modal */}
        <AnimatePresence>
          {showSection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1a2e35] z-10 flex flex-col"
            >
              <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
                <button
                  onClick={() => setShowSection(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <h3 className="text-white font-semibold">
                  {privacySections.find(s => s.id === showSection)?.title}
                </h3>
                <div className="w-8" />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {privacySections.find(s => s.id === showSection)?.options.map(option => (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(showSection, option)}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        privacySections.find(s => s.id === showSection)?.currentValue === option
                          ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                          : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{option}</span>
                        {privacySections.find(s => s.id === showSection)?.currentValue === option && (
                          <Check size={18} className="text-[#00a884]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Account Privacy Settings Component
export const AccountPrivacySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Account Privacy
          </p>
          <p className="text-gray-400 text-sm">Control your privacy</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, accountPrivacyEnabled: !settings.accountPrivacyEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.accountPrivacyEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.accountPrivacyEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.accountPrivacyEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default profile visibility</p>
            <select
              value={settings.defaultProfileVisibility || 'contacts'}
              onChange={(e) => onUpdate({ ...settings, defaultProfileVisibility: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Hide phone number</p>
              <p className="text-gray-400 text-xs">Don't show phone to strangers</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hidePhoneNumber: !settings.hidePhoneNumber })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hidePhoneNumber ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hidePhoneNumber ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Two-factor authentication</p>
              <p className="text-gray-400 text-xs">Add extra security</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.twoFactorAuth ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Privacy Overview Component
export const PrivacyOverview = ({ settings }) => {
  const privacyScore = () => {
    let score = 100;
    if (settings?.profilePhoto === 'Everyone') score -= 10;
    if (settings?.lastSeen === 'Everyone') score -= 15;
    if (settings?.status === 'Everyone') score -= 10;
    if (settings?.groups === 'Everyone') score -= 15;
    if (!settings?.readReceipts) score -= 5;
    return Math.max(0, score);
  };

  const score = privacyScore();
  const scoreColor = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#00a884]" />
          <span className="text-white font-medium">Privacy Score</span>
        </div>
        <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-gray-400 text-xs mt-2">
        {score >= 70 ? 'Your privacy settings are strong' : score >= 40 ? 'Consider improving your privacy' : 'Your privacy needs attention'}
      </p>
    </div>
  );
};

// Quick Privacy Toggle Component
export const QuickPrivacyToggle = ({ setting, value, onToggle }) => {
  const settingLabels = {
    profilePhoto: 'Profile Photo',
    lastSeen: 'Last Seen',
    status: 'Status',
    readReceipts: 'Read Receipts'
  };

  return (
    <div className="flex items-center justify-between bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20">
      <span className="text-white text-sm">{settingLabels[setting] || setting}</span>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-all ${
          value ? 'bg-[#00a884]' : 'bg-[#1a2e35]'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transition-all ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};

export default AccountPrivacy;
