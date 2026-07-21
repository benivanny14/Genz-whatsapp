import React, { useState } from 'react';
import { Radio, Plus, X, Edit, Trash2, Send, Users, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BroadcastLists = ({ lists, contacts, onCreateList, onUpdateList, onDeleteList, onSendBroadcast, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [newList, setNewList] = useState({
    name: '',
    selectedContacts: []
  });
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const handleCreateList = () => {
    if (!newList.name || newList.selectedContacts.length === 0) return;

    const list = {
      id: Date.now(),
      ...newList,
      createdAt: new Date().toISOString(),
      messageCount: 0
    };

    onCreateList(list);
    setNewList({ name: '', selectedContacts: [] });
    setShowCreateModal(false);
  };

  const handleEditList = (list) => {
    setEditingList(list);
    setNewList({
      name: list.name,
      selectedContacts: list.selectedContacts
    });
    setShowCreateModal(true);
  };

  const handleUpdateList = () => {
    const updatedList = {
      ...editingList,
      ...newList
    };

    onUpdateList(updatedList);
    setEditingList(null);
    setNewList({ name: '', selectedContacts: [] });
    setShowCreateModal(false);
  };

  const handleToggleContact = (contactId) => {
    setNewList(prev => ({
      ...prev,
      selectedContacts: prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId]
    }));
  };

  const handleSendBroadcast = (listId) => {
    const list = lists.find(l => l._id === listId);
    if (onSendBroadcast) {
      onSendBroadcast(list);
    }
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
              <Radio size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Broadcast Lists</h2>
              <p className="text-gray-400 text-sm">{lists.length} lists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {lists.map(list => (
              <motion.div
                key={list._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <Radio size={24} className="text-[#00a884]" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{list.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users size={14} />
                        <span>{list.selectedContacts?.length || 0} contacts</span>
                        <span>•</span>
                        <span>{list.messageCount || 0} messages sent</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendBroadcast(list._id)}
                      className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors"
                      title="Send broadcast"
                    >
                      <Send size={18} />
                    </button>
                    <button
                      onClick={() => handleEditList(list)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDeleteList(list._id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {lists.length === 0 && (
            <div className="text-center py-12">
              <Radio className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No broadcast lists yet</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingList(null);
              setNewList({ name: '', selectedContacts: [] });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Create List
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">
                  {editingList ? 'Edit List' : 'Create List'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingList(null);
                    setNewList({ name: '', selectedContacts: [] });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">List Name</label>
                  <input
                    type="text"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    placeholder="e.g., Family, Work Friends"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Select Contacts</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact._id}
                        onClick={() => handleToggleContact(contact._id)}
                        className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
                          newList.selectedContacts.includes(contact._id)
                            ? 'bg-[#00a884]/20 border border-[#00a884]'
                            : 'bg-[#0b141a] border border-[#00a884]/30 hover:border-[#00a884]'
                        }`}
                      >
                        <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {contact.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{contact.name}</p>
                          <p className="text-gray-400 text-xs">{contact.phone}</p>
                        </div>
                        {newList.selectedContacts.includes(contact._id) && (
                          <Check size={16} className="text-[#00a884]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{newList.selectedContacts.length} contacts selected</span>
                </div>

                <button
                  onClick={editingList ? handleUpdateList : handleCreateList}
                  disabled={!newList.name || newList.selectedContacts.length === 0}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {editingList ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Broadcast Settings Component
export const BroadcastSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Radio size={18} className="text-[#00a884]" />
            Broadcast Lists
          </p>
          <p className="text-gray-400 text-sm">Send messages to multiple contacts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, broadcastListsEnabled: !settings.broadcastListsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.broadcastListsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.broadcastListsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.broadcastListsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Delivery receipts</p>
              <p className="text-gray-400 text-xs">Show delivery status</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, broadcastDeliveryReceipts: !settings.broadcastDeliveryReceipts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.broadcastDeliveryReceipts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.broadcastDeliveryReceipts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max recipients per list</p>
            <select
              value={settings.maxBroadcastRecipients || '256'}
              onChange={(e) => onUpdate({ ...settings, maxBroadcastRecipients: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="50">50 contacts</option>
              <option value="100">100 contacts</option>
              <option value="256">256 contacts</option>
              <option value="500">500 contacts</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Broadcast Message Component
export const BroadcastMessage = ({ list, onSend }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(list._id, message);
    setMessage('');
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <Radio size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">{list.name}</span>
        <span className="text-gray-400 text-xs">({list.selectedContacts?.length} recipients)</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#1a2e35] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default BroadcastLists;
