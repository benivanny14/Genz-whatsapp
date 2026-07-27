import React, { useState } from 'react';
import { UserPlus, X, Search, Check, User, Share2, Phone, Mail, Copy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContactSharing = ({ contacts, onShare, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isSharing, setIsSharing] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleShare = async () => {
    setIsSharing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSharing(false);
    if (onShare) {
      onShare(selectedContacts);
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Share2 size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Share Contact</h2>
              <p className="text-gray-400 text-sm">{contacts.length} contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Selected Contacts */}
        {selectedContacts.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{selectedContacts.length} selected</span>
              <button
                onClick={() => setSelectedContacts([])}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredContacts.map(contact => (
              <motion.button
                key={contact._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleSelectContact(contact._id)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                  selectedContacts.includes(contact._id)
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact._id)}
                  onChange={() => handleSelectContact(contact._id)}
                  className="w-5 h-5 rounded"
                />
                <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[#00a884]" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-sm">{contact.phone}</p>
                </div>
                {selectedContacts.includes(contact._id) && <Check size={18} className="text-[#00a884]" />}
              </motion.button>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <User className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No contacts found' : 'No contacts available'}
              </p>
            </div>
          )}
        </div>

        {/* Share Button */}
        {selectedContacts.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSharing ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  Share Contact{selectedContacts.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Contact Card Component
export const ContactCard = ({ contact, onCall, onMessage, onShare }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={28} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{contact.name}</h3>
          <p className="text-gray-400 text-sm">{contact.phone}</p>
        </div>
        <button
          onClick={() => setShowActions(!showActions)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Share2 size={18} />
        </button>
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-[#00a884]/20"
          >
            <div className="flex gap-2">
              <button
                onClick={() => onCall?.(contact)}
                className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Phone size={16} />
                Call
              </button>
              <button
                onClick={() => onMessage?.(contact)}
                className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Mail size={16} />
                Message
              </button>
              <button
                onClick={() => onShare?.(contact)}
                className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Contact VCard Component
export const ContactVCard = ({ contact, onCopy }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={24} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">{contact.name}</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Phone size={14} />
              <span>{contact.phone}</span>
            </div>
            {contact.email && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail size={14} />
                <span>{contact.email}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onCopy?.(contact)}
          className="text-gray-400 hover:text-[#00a884] transition-colors"
          title="Copy contact"
        >
          <Copy size={18} />
        </button>
      </div>
    </div>
  );
};

// Contact Share Button Component
export const ContactShareButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Share contact"
    >
      <Share2 size={18} />
    </button>
  );
};

// Quick Contact Share Component
export const QuickContactShare = ({ contact, onShare }) => {
  return (
    <button
      onClick={() => onShare?.(contact)}
      className="flex items-center gap-2 bg-[#0b141a] px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors"
    >
      <Share2 size={16} className="text-[#00a884]" />
      <span className="text-white text-sm">Share Contact</span>
    </button>
  );
};

// Contact Sharing Settings Component
export const ContactSharingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Share2 size={18} className="text-[#00a884]" />
            Contact Sharing
          </p>
          <p className="text-gray-400 text-sm">Share contacts easily</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, contactSharingEnabled: !settings.contactSharingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.contactSharingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.contactSharingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.contactSharingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include phone number</p>
              <p className="text-gray-400 text-xs">Share phone in vCard</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, includePhone: !settings.includePhone })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.includePhone ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.includePhone ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include email</p>
              <p className="text-gray-400 text-xs">Share email in vCard</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, includeEmail: !settings.includeEmail })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.includeEmail ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.includeEmail ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-save received contacts</p>
              <p className="text-gray-400 text-xs">Add to contacts automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSaveContacts: !settings.autoSaveContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSaveContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSaveContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactSharing;
