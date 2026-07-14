import React, { useState, useEffect, useRef } from 'react';
import { AtSign, X, Check, RefreshCw, Search, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageMention = ({ message, contacts, onMention, onClose }) => {
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        contact.username?.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts.slice(0, 5));
    }
  }, [mentionQuery, contacts]);

  const handleAddMention = (contact) => {
    if (!selectedContacts.find(c => c._id === contact._id)) {
      setSelectedContacts([...selectedContacts, contact]);
    }
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const handleRemoveMention = (contactId) => {
    setSelectedContacts(selectedContacts.filter(c => c._id !== contactId));
  };

  const handleSaveMentions = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsAdding(false);

    if (onMention) {
      onMention({
        messageId: message._id,
        mentions: selectedContacts.map(c => ({
          contactId: c._id,
          name: c.name,
          username: c.username
        }))
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AtSign className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Mention Contacts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-xs mb-2">Message:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Mention Input */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Search contacts to mention</p>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              ref={inputRef}
              type="text"
              value={mentionQuery}
              onChange={(e) => setMentionQuery(e.target.value)}
              placeholder="@username"
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Selected Mentions */}
        {selectedContacts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedContacts.map(contact => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm"
              >
                <AtSign size={12} />
                <span>{contact.name || contact.username}</span>
                <button
                  onClick={() => handleRemoveMention(contact._id)}
                  className="hover:opacity-70"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contact Suggestions */}
        <div className="mb-4 max-h-48 overflow-y-auto">
          <p className="text-gray-400 text-sm mb-2">Suggested contacts</p>
          <div className="space-y-2">
            {filteredContacts.map(contact => (
              <button
                key={contact._id}
                onClick={() => handleAddMention(contact)}
                disabled={selectedContacts.find(c => c._id === contact._id)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                  selectedContacts.find(c => c._id === contact._id)
                    ? 'border-[#00a884] bg-[#00a884]/10 opacity-50'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-[#00a884]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{contact.name}</p>
                  <p className="text-gray-400 text-xs">@{contact.username}</p>
                </div>
                {selectedContacts.find(c => c._id === contact._id) && (
                  <Check size={18} className="text-[#00a884]" />
                )}
              </button>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-4">
              <User className="text-gray-600 mx-auto mb-2" size={24} />
              <p className="text-gray-400 text-sm">No contacts found</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveMentions}
          disabled={isAdding || selectedContacts.length === 0}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAdding ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Adding...
            </>
          ) : (
            <>
              <AtSign size={18} />
              Add Mentions
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Mention Input Component
export const MentionInput = ({ contacts, onMention, message }) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setQuery(value);
    setCursorPosition(cursor);

    // Check if we're typing a mention (after @)
    const textBeforeCursor = value.substring(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const mentionQuery = mentionMatch[1];
      const filtered = contacts.filter(contact =>
        contact.username?.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        contact.name?.toLowerCase().startsWith(mentionQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectMention = (contact) => {
    const textBeforeMention = query.substring(0, cursorPosition).replace(/@\w*$/, '');
    const textAfterMention = query.substring(cursorPosition);
    const newValue = textBeforeMention + `@${contact.username} ` + textAfterMention;
    
    setQuery(newValue);
    setShowSuggestions(false);
    onMention?.({
      contactId: contact._id,
      name: contact.name,
      username: contact.username
    });
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Type @ to mention..."
        className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
      />

      <AnimatePresence>
        {showSuggestions && filteredContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#1a2e35] rounded-lg border border-[#00a884]/20 shadow-xl max-h-48 overflow-y-auto z-10"
          >
            {filteredContacts.map(contact => (
              <button
                key={contact._id}
                onClick={() => handleSelectMention(contact)}
                className="w-full p-3 hover:bg-[#00a884]/10 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-[#00a884]" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white text-sm">{contact.name}</p>
                  <p className="text-gray-400 text-xs">@{contact.username}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mention Badge Component
export const MentionBadge = ({ mention, onClick }) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs hover:bg-[#00a884]/30 transition-colors cursor-pointer"
    >
      <AtSign size={10} />
      <span>{mention.name || mention.username}</span>
    </motion.button>
  );
};

// Mentioned Message Component
export const MentionedMessage = ({ message, mentions, onMentionClick }) => {
  const renderContentWithMentions = (content) => {
    if (!mentions || mentions.length === 0) return content;

    let processedContent = content;
    mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention.username}`, 'g');
      processedContent = processedContent.replace(
        mentionRegex,
        `<span class="text-[#00a884] cursor-pointer hover:underline">@${mention.username}</span>`
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: processedContent }} />;
  };

  return (
    <div>
      <p className="text-white">
        {renderContentWithMentions(message.content)}
      </p>
      {mentions && mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {mentions.map(mention => (
            <MentionBadge
              key={mention.contactId}
              mention={mention}
              onClick={() => onMentionClick?.(mention)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Mention Notification Component
export const MentionNotification = ({ mention, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="bg-[#00a884]/10 border border-[#00a884] rounded-lg p-3 cursor-pointer hover:bg-[#00a884]/20 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <AtSign size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">
            {mention.senderName} mentioned you
          </p>
          <p className="text-gray-400 text-xs">
            {mention.messageContent?.substring(0, 50)}...
          </p>
        </div>
        <div className="text-gray-400 text-xs">
          {new Date(mention.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
};

// Mention Settings Component
export const MentionSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <AtSign size={18} className="text-[#00a884]" />
            Mentions
          </p>
          <p className="text-gray-400 text-sm">Mention contacts in messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, mentionsEnabled: !settings.mentionsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.mentionsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.mentionsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.mentionsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Mention notifications</p>
              <p className="text-gray-400 text-xs">Alert when mentioned</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, mentionNotifications: !settings.mentionNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.mentionNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.mentionNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show mention suggestions</p>
              <p className="text-gray-400 text-xs">Auto-complete usernames</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, mentionSuggestions: !settings.mentionSuggestions })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.mentionSuggestions ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.mentionSuggestions ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageMention;
