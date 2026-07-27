import React, { useState } from 'react';
import { Bell, BellOff, Clock, X, Check, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusMute = ({ contacts, onMute, onUnmute, onClose }) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [muteDuration, setMuteDuration] = useState('8hours');
  const [isProcessing, setIsProcessing] = useState(false);

  const durations = [
    { value: '1hour', label: '1 hour', hours: 1 },
    { value: '8hours', label: '8 hours', hours: 8 },
    { value: '1day', label: '1 day', hours: 24 },
    { value: '1week', label: '1 week', hours: 168 },
    { value: 'forever', label: 'Always', hours: Infinity },
  ];

  const mutedContacts = contacts.filter(c => c.isMuted);
  const unmutedContacts = contacts.filter(c => !c.isMuted);

  const handleToggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleMute = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    const duration = durations.find(d => d.value === muteDuration);
    const muteUntil = duration.hours === Infinity ? null : Date.now() + (duration.hours * 60 * 60 * 1000);

    selectedContacts.forEach(contactId => {
      onMute?.(contactId, {
        muted: true,
        muteUntil: muteUntil,
        muteDuration: muteDuration
      });
    });

    setSelectedContacts([]);
  };

  const handleUnmute = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    selectedContacts.forEach(contactId => {
      onUnmute?.(contactId);
    });

    setSelectedContacts([]);
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
              <BellOff size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Mute Status</h2>
              <p className="text-gray-400 text-sm">{mutedContacts.length} muted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Mute Duration */}
        <div className="p-4 border-b border-[#00a884]/20">
          <p className="text-gray-400 text-sm mb-2">Mute duration</p>
          <div className="grid grid-cols-5 gap-2">
            {durations.map(duration => (
              <button
                key={duration.value}
                onClick={() => setMuteDuration(duration.value)}
                className={`p-2 rounded-lg border-2 transition-all text-center ${
                  muteDuration === duration.value
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <span className="text-white text-xs">{duration.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedContacts.length > 0 && (
          <div className="p-4 bg-[#00a884]/10 border-b border-[#00a884]/20">
            <div className="flex items-center justify-between">
              <p className="text-[#00a884] text-sm">
                {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleMute}
                  disabled={isProcessing}
                  className="bg-[#00a884] text-white px-3 py-1 rounded-lg hover:bg-[#008f72] transition-colors text-sm disabled:opacity-50"
                >
                  Mute
                </button>
                <button
                  onClick={handleUnmute}
                  disabled={isProcessing}
                  className="bg-[#0b141a] text-white px-3 py-1 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm disabled:opacity-50"
                >
                  Unmute
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Unmuted Contacts */}
          {unmutedContacts.length > 0 && (
            <div className="mb-6">
              <p className="text-white font-medium mb-3">Active ({unmutedContacts.length})</p>
              <div className="space-y-2">
                {unmutedContacts.map(contact => (
                  <div
                    key={contact._id}
                    className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact._id)}
                      onChange={() => handleToggleContact(contact._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Bell size={20} className="text-[#00a884]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{contact.name}</p>
                      <p className="text-gray-400 text-xs">Status updates active</p>
                    </div>
                    <button
                      onClick={() => onMute?.(contact._id, { muted: true })}
                      className="text-gray-400 hover:text-[#00a884] transition-colors"
                      title="Mute"
                    >
                      <BellOff size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Muted Contacts */}
          {mutedContacts.length > 0 && (
            <div>
              <p className="text-white font-medium mb-3">Muted ({mutedContacts.length})</p>
              <div className="space-y-2">
                {mutedContacts.map(contact => (
                  <div
                    key={contact._id}
                    className="bg-[#0b141a]/50 rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact._id)}
                      onChange={() => handleToggleContact(contact._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <BellOff size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{contact.name}</p>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                        <Clock size={10} />
                        <span>{contact.muteUntil ? `Until ${new Date(contact.muteUntil).toLocaleDateString()}` : 'Forever'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onUnmute?.(contact._id)}
                      className="text-gray-400 hover:text-[#00a884] transition-colors"
                      title="Unmute"
                    >
                      <Bell size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contacts.length === 0 && (
            <div className="text-center py-8">
              <Bell className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No contacts found</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Mute Button Component
export const MuteButton = ({ onClick, isMuted }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        isMuted ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
    </button>
  );
};

// Mute Badge Component
export const MuteBadge = ({ duration }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <BellOff size={10} />
      <span>{duration || 'Muted'}</span>
    </motion.div>
  );
};

export default StatusMute;
