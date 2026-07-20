import React, { useState } from 'react';
import { Phone, X, Check, RefreshCw, AlertTriangle, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallTransfer = ({ call, contacts, onTransfer, onClose }) => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  ).filter(contact => contact._id !== call?.participantId);

  const handleTransfer = async () => {
    if (!selectedContact) return;

    setIsTransferring(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTransferring(false);

    onTransfer?.(call._id, selectedContact._id);
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
          <div className="flex items-center gap-2">
            <Phone className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Transfer Call</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Call Info */}
        <div className="p-4 border-b border-[#00a884]/20">
          <p className="text-gray-400 text-sm mb-2">Current call with</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
              {call?.avatar ? (
                <img
                  src={call.avatar}
                  alt={call.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Phone size={20} className="text-[#00a884]" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{call?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-xs">Active call</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-400 text-sm mb-2">Transfer to</p>
          <div className="space-y-2">
            {filteredContacts.map(contact => (
              <button
                key={contact._id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                  selectedContact?._id === contact._id
                    ? 'border-[#00a884] bg-[#00a884]/10'
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
                    <Users size={20} className="text-[#00a884]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-gray-400 text-xs">{contact.phone}</p>
                </div>
                {selectedContact?._id === contact._id && <Check size={18} className="text-[#00a884]" />}
              </button>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-8">
              <Users className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No contacts found</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="p-4 border-t border-[#00a884]/20 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              Transferring the call will end the current conversation and connect you to the selected contact.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleTransfer}
            disabled={isTransferring || !selectedContact}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTransferring ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Transferring...
              </>
            ) : (
              <>
                <Phone size={18} />
                Transfer Call
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Transfer Button Component
export const TransferButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-full bg-[#0b141a] text-gray-400 hover:text-white transition-colors"
      title="Transfer call"
    >
      <Phone size={20} />
    </button>
  );
};

export default CallTransfer;
