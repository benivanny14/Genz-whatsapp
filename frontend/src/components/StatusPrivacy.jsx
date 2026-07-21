import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Users, Lock, Check, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusPrivacy = ({ settings, onUpdate, onClose }) => {
  const [showModal, setShowModal] = useState(false);

  const privacyOptions = [
    { id: 'everyone', label: 'Everyone', description: 'Your contacts and other users' },
    { id: 'contacts', label: 'My contacts', description: 'Only people in your contacts' },
    { id: 'exclude', label: 'Exclude contacts', description: 'Everyone except selected contacts' },
    { id: 'only', label: 'Only share with', description: 'Only selected contacts' },
  ];

  const handlePrivacyChange = (option) => {
    onUpdate({ ...settings, statusPrivacy: option });
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
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Shield className="text-[#00a884]" />
            Status Privacy
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3">
          {privacyOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handlePrivacyChange(option.id)}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                settings.statusPrivacy === option.id
                  ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                  : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{option.label}</p>
                  <p className="text-gray-400 text-sm">{option.description}</p>
                </div>
                {settings.statusPrivacy === option.id && (
                  <Check size={20} className="text-[#00a884]" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Additional Options */}
        {settings.statusPrivacy === 'exclude' && (
          <div className="mt-4 pt-4 border-t border-[#00a884]/20">
            <p className="text-gray-400 text-sm mb-2">Select contacts to exclude</p>
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Manage excluded contacts
            </button>
          </div>
        )}

        {settings.statusPrivacy === 'only' && (
          <div className="mt-4 pt-4 border-t border-[#00a884]/20">
            <p className="text-gray-400 text-sm mb-2">Select contacts to share with</p>
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
            >
              Manage allowed contacts
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Status Privacy Settings Component
export const StatusPrivacySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Status Privacy
          </p>
          <p className="text-gray-400 text-sm">Control who sees your status</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, statusPrivacyEnabled: !settings.statusPrivacyEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.statusPrivacyEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.statusPrivacyEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.statusPrivacyEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Who can see my status</p>
            <select
              value={settings.statusPrivacy || 'contacts'}
              onChange={(e) => onUpdate({ ...settings, statusPrivacy: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts only</option>
              <option value="exclude">Exclude contacts</option>
              <option value="only">Only share with</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Read receipts</p>
              <p className="text-gray-400 text-xs">Show when people view your status</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, statusReadReceipts: !settings.statusReadReceipts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.statusReadReceipts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.statusReadReceipts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Hide from archived chats</p>
              <p className="text-gray-400 text-xs">Don't show status to archived contacts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hideFromArchived: !settings.hideFromArchived })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hideFromArchived ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hideFromArchived ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-archive status</p>
              <p className="text-gray-400 text-xs">Archive status after 24 hours</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoArchiveStatus: !settings.autoArchiveStatus })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoArchiveStatus ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoArchiveStatus ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Status Privacy Indicator Component
export const StatusPrivacyIndicator = ({ privacy }) => {
  const privacyLabels = {
    everyone: 'Everyone',
    contacts: 'Contacts only',
    exclude: 'Excluding some',
    only: 'Selected contacts'
  };

  const privacyIcons = {
    everyone: Eye,
    contacts: Users,
    exclude: EyeOff,
    only: Lock
  };

  const Icon = privacyIcons[privacy] || Eye;

  return (
    <div className="flex items-center gap-2 text-gray-400 text-xs">
      <Icon size={12} />
      <span>{privacyLabels[privacy] || 'Contacts only'}</span>
    </div>
  );
};

// Contact Selector for Status Privacy
export const ContactSelector = ({ contacts, selectedContacts, onToggle, onClose, mode = 'exclude' }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-semibold">
            {mode === 'exclude' ? 'Exclude Contacts' : 'Select Contacts'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredContacts.map(contact => (
            <button
              key={contact._id}
              onClick={() => onToggle(contact._id)}
              className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                selectedContacts.includes(contact._id)
                  ? 'bg-[#00a884]/20 border border-[#00a884]'
                  : 'bg-[#0b141a] border border-[#00a884]/30 hover:border-[#00a884]'
              }`}
            >
              <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {contact.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{contact.name}</p>
                <p className="text-gray-400 text-sm">{contact.phone}</p>
              </div>
              {selectedContacts.includes(contact._id) && (
                <Check size={18} className="text-[#00a884]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StatusPrivacy;
