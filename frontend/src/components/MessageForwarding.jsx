import React, { useState } from 'react';
import { Forward, X, Search, Send, Users, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageForwarding = ({ message, chats, contacts, onForward, onClose }) => {
  const [selectedChats, setSelectedChats] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, chats, contacts

  const filteredChats = chats.filter(chat =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const handleToggleChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleToggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleForward = () => {
    const targets = [
      ...selectedChats.map(id => ({ type: 'chat', id })),
      ...selectedContacts.map(id => ({ type: 'contact', id }))
    ];

    if (targets.length === 0) return;

    onForward(message._id, targets);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Forward size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Forward Message</h2>
              <p className="text-gray-400 text-sm">{selectedChats.length + selectedContacts.length} selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="bg-[#0b141a] rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Message to forward:</p>
            <p className="text-white text-sm line-clamp-2">{message.content}</p>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or contacts..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filterType === 'all'
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('chats')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filterType === 'chats'
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setFilterType('contacts')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filterType === 'contacts'
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#0b141a] text-gray-400 hover:text-white'
              }`}
            >
              Contacts
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {(filterType === 'all' || filterType === 'chats') && (
              <>
                <p className="text-gray-400 text-xs font-medium mb-2">CHATS</p>
                {filteredChats.map(chat => (
                  <motion.button
                    key={chat._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleToggleChat(chat._id)}
                    className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                      selectedChats.includes(chat._id)
                        ? 'bg-[#00a884]/20 border border-[#00a884]'
                        : 'bg-[#0b141a] border border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {chat.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{chat.name}</p>
                      <p className="text-gray-400 text-xs">{chat.isGroup ? 'Group' : 'Individual'}</p>
                    </div>
                    {selectedChats.includes(chat._id) && (
                      <Check size={18} className="text-[#00a884]" />
                    )}
                  </motion.button>
                ))}
              </>
            )}

            {(filterType === 'all' || filterType === 'contacts') && (
              <>
                <p className="text-gray-400 text-xs font-medium mb-2 mt-4">CONTACTS</p>
                {filteredContacts.map(contact => (
                  <motion.button
                    key={contact._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleToggleContact(contact._id)}
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
                      <p className="text-gray-400 text-xs">{contact.phone}</p>
                    </div>
                    {selectedContacts.includes(contact._id) && (
                      <Check size={18} className="text-[#00a884]" />
                    )}
                  </motion.button>
                ))}
              </>
            )}
          </div>

          {filteredChats.length === 0 && filteredContacts.length === 0 && (
            <div className="text-center py-8">
              <Search className="text-gray-600 mx-auto mb-2" size={32} />
              <p className="text-gray-400 text-sm">No results found</p>
            </div>
          )}
        </div>

        {/* Forward Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleForward}
            disabled={selectedChats.length === 0 && selectedContacts.length === 0}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={18} />
            Forward to {selectedChats.length + selectedContacts.length} recipient{selectedChats.length + selectedContacts.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Forward Button Component
export const ForwardButton = ({ message, onForward }) => {
  const [showForwardModal, setShowForwardModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForwardModal(true)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Forward message"
      >
        <Forward size={16} />
      </button>

      <AnimatePresence>
        {showForwardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <MessageForwarding
              message={message}
              chats={[]} // Pass actual chats from context
              contacts={[]} // Pass actual contacts from context
              onForward={(messageId, targets) => {
                onForward(messageId, targets);
                setShowForwardModal(false);
              }}
              onClose={() => setShowForwardModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Forwarded Message Indicator Component
export const ForwardedIndicator = ({ forwardedFrom, forwardedAt }) => {
  return (
    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
      <Forward size={10} />
      <span>
        Forwarded {forwardedFrom ? `from ${forwardedFrom}` : ''}
        {forwardedAt && ` • ${new Date(forwardedAt).toLocaleDateString()}`}
      </span>
    </div>
  );
};

// Message Forwarding Settings Component
export const MessageForwardingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Forward size={18} className="text-[#00a884]" />
            Message Forwarding
          </p>
          <p className="text-gray-400 text-sm">Forward messages to other chats</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageForwardingEnabled: !settings.messageForwardingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageForwardingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageForwardingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageForwardingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show forwarded indicator</p>
              <p className="text-gray-400 text-xs">Display "Forwarded" label</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showForwardedIndicator: !settings.showForwardedIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showForwardedIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showForwardedIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max recipients per forward</p>
            <select
              value={settings.maxForwardRecipients || '5'}
              onChange={(e) => onUpdate({ ...settings, maxForwardRecipients: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1">1 recipient</option>
              <option value="5">5 recipients</option>
              <option value="10">10 recipients</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Forward media caption</p>
              <p className="text-gray-400 text-xs">Include caption when forwarding media</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, forwardMediaCaption: !settings.forwardMediaCaption })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.forwardMediaCaption ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.forwardMediaCaption ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageForwarding;
