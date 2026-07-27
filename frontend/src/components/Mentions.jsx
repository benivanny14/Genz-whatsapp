import React, { useState, useEffect, useRef } from 'react';
import { AtSign, X, User, Users, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Mentions = ({ message, onMention, chatParticipants, currentUser }) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (mentionQuery.startsWith('@')) {
      const query = mentionQuery.substring(1).toLowerCase();
      const filtered = chatParticipants.filter(participant =>
        participant.name.toLowerCase().includes(query) &&
        participant._id !== currentUser._id
      );
      setFilteredParticipants(filtered);
      setSelectedMentionIndex(0);
    } else {
      setFilteredParticipants([]);
    }
  }, [mentionQuery, chatParticipants, currentUser._id]);

  const handleMentionSelect = (participant) => {
    if (!mentionedUsers.find(u => u._id === participant._id)) {
      setMentionedUsers([...mentionedUsers, participant]);
      if (onMention) {
        onMention(participant._id, participant.name);
      }
    }
    setMentionQuery('');
    setShowMentions(false);
  };

  const handleRemoveMention = (userId) => {
    setMentionedUsers(mentionedUsers.filter(u => u._id !== userId));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex(prev => 
        Math.min(prev + 1, filteredParticipants.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredParticipants.length > 0) {
      e.preventDefault();
      handleMentionSelect(filteredParticipants[selectedMentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  return (
    <div className="relative">
      {/* Mentioned Users Tags */}
      {mentionedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {mentionedUsers.map(user => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#00a884]/20 text-[#00a884] px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              <AtSign size={12} />
              {user.name}
              <button
                onClick={() => handleRemoveMention(user._id)}
                className="hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mention Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={mentionQuery}
          onChange={(e) => {
            setMentionQuery(e.target.value);
            setShowMentions(e.target.value.startsWith('@'));
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type @ to mention someone..."
          className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
        />

        {/* Mentions Dropdown */}
        <AnimatePresence>
          {showMentions && filteredParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 max-h-60 overflow-y-auto z-50"
            >
              {filteredParticipants.map((participant, index) => (
                <button
                  key={participant._id}
                  onClick={() => handleMentionSelect(participant)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#00a884]/10 transition-all ${
                    index === selectedMentionIndex ? 'bg-[#00a884]/20' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                    <User size={20} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{participant.name}</p>
                    <p className="text-gray-400 text-xs">{participant.status || 'Available'}</p>
                  </div>
                  {index === selectedMentionIndex && (
                    <Check size={16} className="text-[#00a884]" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Mention Notification Component
export const MentionNotification = ({ mention, onView }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#00a884]/20 border-l-4 border-[#00a884] p-4 rounded-r-lg mb-3 cursor-pointer hover:bg-[#00a884]/30 transition-colors"
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AtSign size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">
            {mention.mentionedBy.name} mentioned you
          </p>
          <p className="text-gray-300 text-sm line-clamp-2">{mention.message}</p>
          <p className="text-gray-500 text-xs mt-1">{mention.chatName}</p>
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
          <p className="text-gray-400 text-sm">Allow others to mention you</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, allowMentions: !settings.allowMentions })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.allowMentions ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.allowMentions ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.allowMentions && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Mention notifications</p>
              <p className="text-gray-400 text-xs">Get notified when mentioned</p>
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
              <p className="text-white text-sm">Sound</p>
              <p className="text-gray-400 text-xs">Play sound for mentions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, mentionSound: !settings.mentionSound })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.mentionSound ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.mentionSound ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Who can mention you</p>
            <select
              value={settings.mentionPrivacy || 'everyone'}
              onChange={(e) => onUpdate({ ...settings, mentionPrivacy: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">My contacts only</option>
              <option value="groups">Groups only</option>
              <option value="none">No one</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Mention Highlight in Message
export const MentionHighlight = ({ mention, onClick }) => {
  return (
    <span
      onClick={onClick}
      className="bg-[#00a884]/20 text-[#00a884] px-1 py-0.5 rounded cursor-pointer hover:bg-[#00a884]/30 transition-colors font-medium"
    >
      @{mention.name}
    </span>
  );
};

// Group Mention Component
export const GroupMention = ({ group, onMentionAll }) => {
  return (
    <button
      onClick={() => onMentionAll(group._id)}
      className="bg-[#00a884]/10 text-[#00a884] px-3 py-1 rounded-full text-sm flex items-center gap-2 hover:bg-[#00a884]/20 transition-colors"
    >
      <Users size={14} />
      @all
    </button>
  );
};

// Mention Suggestions Component
export const MentionSuggestions = ({ query, participants, onSelect }) => {
  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <div className="text-center py-4">
        <Users className="text-gray-600 mx-auto mb-2" size={24} />
        <p className="text-gray-400 text-sm">No matches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filtered.slice(0, 5).map(participant => (
        <button
          key={participant._id}
          onClick={() => onSelect(participant)}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#00a884]/10 rounded-lg transition-colors text-left"
        >
          <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
            <User size={16} className="text-[#00a884]" />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{participant.name}</p>
            <p className="text-gray-400 text-xs">{participant.status || 'Available'}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default Mentions;
