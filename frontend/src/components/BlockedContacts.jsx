import React, { useState } from 'react';
import { UserMinus, X, Search, Ban, Check, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BlockedContacts = ({ blockedContacts, onUnblock, onBlock, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const filteredContacts = blockedContacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const handleUnblock = (contactId) => {
    if (onUnblock) {
      onUnblock(contactId);
    }
  };

  const handleBlock = (contactId) => {
    if (onBlock) {
      onBlock(contactId);
    }
    setShowBlockModal(false);
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
              <UserMinus size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Blocked Contacts</h2>
              <p className="text-gray-400 text-sm">{blockedContacts.length} blocked</p>
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
              placeholder="Search blocked contacts..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Blocked List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredContacts.map(contact => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3 border border-[#00a884]/20"
              >
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Ban size={18} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-sm">{contact.phone}</p>
                  <p className="text-gray-500 text-xs">
                    Blocked {new Date(contact.blockedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(contact._id)}
                  className="text-[#00a884] hover:text-white transition-colors"
                  title="Unblock"
                >
                  <Shield size={18} />
                </button>
              </motion.div>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <UserMinus className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No blocked contacts found' : 'No blocked contacts'}
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 border-t border-[#00a884]/20">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Blocked contacts cannot send you messages or see your status updates. They won't be notified that they've been blocked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Block Contact Modal
export const BlockContactModal = ({ contact, onBlock, onCancel }) => {
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    setIsBlocking(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsBlocking(false);
    if (onBlock) {
      onBlock(contact._id);
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
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban size={32} className="text-red-500" />
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Block Contact?</h3>
          <p className="text-gray-400 text-sm">{contact.name}</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-red-500 text-xs">
              Blocking this contact will prevent them from sending you messages and seeing your status updates. They won't be notified.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBlock}
            disabled={isBlocking}
            className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-500/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBlocking ? (
              <>
                <RefreshCw className="animate-spin" size={16} />
                Blocking...
              </>
            ) : (
              'Block'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Blocked Contacts Settings Component
export const BlockedContactsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <UserMinus size={18} className="text-[#00a884]" />
            Blocked Contacts
          </p>
          <p className="text-gray-400 text-sm">Manage blocked contacts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, blockedContactsEnabled: !settings.blockedContactsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.blockedContactsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.blockedContactsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.blockedContactsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Block unknown numbers</p>
              <p className="text-gray-400 text-xs">Auto-block from unknown contacts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, blockUnknownNumbers: !settings.blockUnknownNumbers })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.blockUnknownNumbers ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.blockUnknownNumbers ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Report when blocking</p>
              <p className="text-gray-400 text-xs">Send spam report to WhatsApp</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reportWhenBlocking: !settings.reportWhenBlocking })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reportWhenBlocking ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reportWhenBlocking ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Hide blocked contacts</p>
              <p className="text-gray-400 text-xs">Don't show in contact list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hideBlockedContacts: !settings.hideBlockedContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hideBlockedContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hideBlockedContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Block Button Component
export const BlockButton = ({ contact, onBlock }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
        title="Block contact"
      >
        <Ban size={16} />
      </button>

      <AnimatePresence>
        {showModal && (
          <BlockContactModal
            contact={contact}
            onBlock={(contactId) => {
              onBlock(contactId);
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Blocked Contact Indicator Component
export const BlockedContactIndicator = ({ isBlocked }) => {
  return (
    <AnimatePresence>
      {isBlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-red-500/20 border border-red-500 rounded-lg px-3 py-2 flex items-center gap-2"
        >
          <Ban size={14} className="text-red-500" />
          <span className="text-red-500 text-sm">Blocked</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Blocked Contacts Summary Component
export const BlockedContactsSummary = ({ blockedCount, onManage }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <UserMinus size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-white font-medium">Blocked Contacts</p>
            <p className="text-gray-400 text-sm">{blockedCount} contacts blocked</p>
          </div>
        </div>
        <button
          onClick={onManage}
          className="text-[#00a884] hover:text-white transition-colors"
        >
          Manage
        </button>
      </div>
    </div>
  );
};

export default BlockedContacts;
