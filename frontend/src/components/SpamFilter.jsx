import React, { useState } from 'react';
import { ShieldAlert, X, Check, AlertTriangle, RefreshCw, Filter, Trash2, Flag, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SpamFilter = ({ spamMessages, onMarkAsSpam, onMarkAsNotSpam, onDelete, onConfigure, onClose }) => {
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [filterLevel, setFilterLevel] = useState('medium'); // low, medium, high

  const filteredMessages = spamMessages.filter(msg => {
    if (filterLevel === 'low') return msg.spamScore >= 80;
    if (filterLevel === 'medium') return msg.spamScore >= 50;
    if (filterLevel === 'high') return msg.spamScore >= 20;
    return true;
  });

  const handleSelectMessage = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleBulkAction = (action) => {
    selectedMessages.forEach(messageId => {
      if (action === 'spam') onMarkAsSpam?.(messageId);
      if (action === 'not_spam') onMarkAsNotSpam?.(messageId);
      if (action === 'delete') onDelete?.(messageId);
    });
    setSelectedMessages([]);
  };

  const getSpamLevelColor = (score) => {
    if (score >= 80) return 'text-red-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getSpamLevelLabel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <ShieldAlert size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Spam Filter</h2>
              <p className="text-gray-400 text-sm">{filteredMessages.length} potential spam</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-gray-400" />
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(level => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                    filterLevel === level
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <button
              onClick={onConfigure}
              className="ml-auto text-[#00a884] hover:text-white transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMessages.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20 bg-[#00a884]/10">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{selectedMessages.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('spam')}
                  className="text-red-500 hover:text-white transition-colors text-sm"
                >
                  Mark as Spam
                </button>
                <button
                  onClick={() => handleBulkAction('not_spam')}
                  className="text-[#00a884] hover:text-white transition-colors text-sm"
                >
                  Not Spam
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="text-gray-400 hover:text-red-500 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spam Messages List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredMessages.map(message => (
              <motion.div
                key={message._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#0b141a] rounded-lg p-4 border ${
                  selectedMessages.includes(message._id)
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedMessages.includes(message._id)}
                    onChange={() => handleSelectMessage(message._id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{message.sender}</span>
                      <span className={`text-xs ${getSpamLevelColor(message.spamScore)}`}>
                        {getSpamLevelLabel(message.spamScore)} ({message.spamScore}%)
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{message.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{new Date(message.timestamp).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{message.reason}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onMarkAsSpam?.(message._id)}
                      className="text-red-500 hover:text-white transition-colors p-1"
                      title="Mark as spam"
                    >
                      <Flag size={16} />
                    </button>
                    <button
                      onClick={() => onMarkAsNotSpam?.(message._id)}
                      className="text-[#00a884] hover:text-white transition-colors p-1"
                      title="Not spam"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => onDelete?.(message._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredMessages.length === 0 && (
            <div className="text-center py-12">
              <ShieldAlert className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No spam messages detected</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Spam Filter Settings Component
export const SpamFilterSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <ShieldAlert size={18} className="text-[#00a884]" />
            Spam Filter
          </p>
          <p className="text-gray-400 text-sm">Protect from spam messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, spamFilterEnabled: !settings.spamFilterEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.spamFilterEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.spamFilterEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.spamFilterEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Filter sensitivity</p>
            <select
              value={settings.spamSensitivity || 'medium'}
              onChange={(e) => onUpdate({ ...settings, spamSensitivity: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-block spam</p>
              <p className="text-gray-400 text-xs">Automatically block spammers</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoBlockSpam: !settings.autoBlockSpam })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoBlockSpam ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoBlockSpam ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Report spam</p>
              <p className="text-gray-400 text-xs">Send reports to WhatsApp</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reportSpam: !settings.reportSpam })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reportSpam ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reportSpam ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show spam indicator</p>
              <p className="text-gray-400 text-xs">Display spam warnings</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showSpamIndicator: !settings.showSpamIndicator })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showSpamIndicator ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showSpamIndicator ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Spam Warning Component
export const SpamWarning = ({ spamScore, onReport, onIgnore }) => {
  const getWarningColor = (score) => {
    if (score >= 80) return 'bg-red-500/20 border-red-500';
    if (score >= 50) return 'bg-yellow-500/20 border-yellow-500';
    return 'bg-orange-500/20 border-orange-500';
  };

  return (
    <div className={`rounded-lg p-3 border ${getWarningColor(spamScore)}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
        <div className="flex-1">
          <p className="text-white text-sm font-medium mb-1">
            This message may be spam ({spamScore}% confidence)
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onReport}
              className="text-red-500 hover:text-white text-xs transition-colors"
            >
              Report
            </button>
            <button
              onClick={onIgnore}
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Spam Filter Button Component
export const SpamFilterButton = ({ onOpen, spamCount }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Spam filter"
    >
      <ShieldAlert size={18} />
      {spamCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {spamCount}
        </span>
      )}
    </button>
  );
};

// Spam Statistics Component
export const SpamStatistics = ({ stats }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Spam Statistics</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a2e35] rounded p-3 text-center">
          <p className="text-white text-xl font-bold">{stats?.detected || 0}</p>
          <p className="text-gray-500 text-xs">Detected</p>
        </div>
        <div className="bg-[#1a2e35] rounded p-3 text-center">
          <p className="text-white text-xl font-bold">{stats?.blocked || 0}</p>
          <p className="text-gray-500 text-xs">Blocked</p>
        </div>
        <div className="bg-[#1a2e35] rounded p-3 text-center">
          <p className="text-white text-xl font-bold">{stats?.reported || 0}</p>
          <p className="text-gray-500 text-xs">Reported</p>
        </div>
      </div>
    </div>
  );
};

export default SpamFilter;
