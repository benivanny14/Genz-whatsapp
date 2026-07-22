import React, { useState } from 'react';
import { Timer, X, Phone, Video, Filter, Trash2, Search, Calendar, User, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallHistory = ({ calls, onCall, onVideoCall, onDelete, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, missed, incoming, outgoing
  const [selectedDate, setSelectedDate] = useState('all');

  const filteredCalls = calls.filter(call => {
    const matchesSearch = call.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         call.phoneNumber?.includes(searchQuery);
    
    const matchesFilter = filterType === 'all' || call.type === filterType;
    
    const matchesDate = selectedDate === 'all' || 
                       new Date(call.timestamp).toDateString() === new Date(selectedDate).toDateString();
    
    return matchesSearch && matchesFilter && matchesDate;
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (type) => {
    switch (type) {
      case 'incoming':
        return <ArrowDownRight size={16} className="text-[#00a884]" />;
      case 'outgoing':
        return <ArrowUpRight size={16} className="text-[#00a884]" />;
      case 'missed':
        return <ArrowDownRight size={16} className="text-red-500" />;
      default:
        return <Phone size={16} className="text-gray-400" />;
    }
  };

  const groupedCalls = filteredCalls.reduce((groups, call) => {
    const date = new Date(call.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(call);
    return groups;
  }, {});

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
              <Timer size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Call History</h2>
              <p className="text-gray-400 text-sm">{calls.length} calls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calls..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'missed', 'incoming', 'outgoing'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg text-sm capitalize transition-all ${
                  filterType === type
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Calls List */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(groupedCalls).length === 0 ? (
            <div className="text-center py-12">
              <Clock className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No calls found' : 'No call history'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCalls).map(([date, dateCalls]) => (
                <div key={date}>
                  <p className="text-gray-400 text-xs font-medium mb-2">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <div className="space-y-2">
                    {dateCalls.map(call => (
                      <motion.div
                        key={call.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3 border border-[#00a884]/20"
                      >
                        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                          <User size={18} className="text-[#00a884]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{call.contactName}</span>
                            {getCallIcon(call.type)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{call.phoneNumber}</span>
                            <span>•</span>
                            <span>{formatDuration(call.duration)}</span>
                            <span>•</span>
                            <span>{new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onCall?.(call.contactId)}
                            className="text-[#00a884] hover:text-white transition-colors"
                            title="Voice call"
                          >
                            <Phone size={16} />
                          </button>
                          <button
                            onClick={() => onVideoCall?.(call.contactId)}
                            className="text-[#00a884] hover:text-white transition-colors"
                            title="Video call"
                          >
                            <Video size={16} />
                          </button>
                          <button
                            onClick={() => onDelete?.(call.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear All Button */}
        {filteredCalls.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20">
            <button
              onClick={() => {
                filteredCalls.forEach(call => onDelete?.(call.id));
              }}
              className="w-full bg-red-500/20 text-red-500 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Call History Button Component
export const CallHistoryButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#00a884]/10 transition-colors"
      title="Call history"
    >
      <Clock size={18} />
    </button>
  );
};

// Call History Settings Component
export const CallHistorySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Clock size={18} className="text-[#00a884]" />
            Call History
          </p>
          <p className="text-gray-400 text-sm">Track call records</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, callHistoryEnabled: !settings.callHistoryEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.callHistoryEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.callHistoryEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.callHistoryEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">History retention</p>
            <select
              value={settings.historyRetention || '30days'}
              onChange={(e) => onUpdate({ ...settings, historyRetention: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="7days">7 days</option>
              <option value="30days">30 days</option>
              <option value="90days">90 days</option>
              <option value="forever">Forever</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show missed calls first</p>
              <p className="text-gray-400 text-xs">Prioritize missed calls</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, missedCallsFirst: !settings.missedCallsFirst })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.missedCallsFirst ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.missedCallsFirst ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-sync with contacts</p>
              <p className="text-gray-400 text-xs">Match numbers to contacts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, syncWithContacts: !settings.syncWithContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.syncWithContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.syncWithContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Recent Calls Component
export const RecentCalls = ({ calls, onCall, onVideoCall }) => {
  const recentCalls = calls.slice(0, 5);
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Clock size={18} className="text-[#00a884]" />
        Recent Calls
      </h3>

      <div className="space-y-2">
        {recentCalls.map(call => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-3 flex items-center gap-3 border border-[#00a884]/20"
          >
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <User size={18} className="text-[#00a884]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{call.contactName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="capitalize">{call.type}</span>
                <span>•</span>
                <span>{formatDuration(call.duration)}</span>
                <span>•</span>
                <span>{new Date(call.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onCall?.(call.contactId)}
                className="text-[#00a884] hover:text-white transition-colors"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => onVideoCall?.(call.contactId)}
                className="text-[#00a884] hover:text-white transition-colors"
              >
                <Video size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {recentCalls.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Clock className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No recent calls</p>
        </div>
      )}
    </div>
  );
};

export default CallHistory;
