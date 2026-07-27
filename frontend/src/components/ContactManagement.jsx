import React, { useState } from 'react';
import { UserPlus, X, Edit, Trash2, Search, Phone, Mail, MoreVertical, Check, Filter, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ContactManagement = ({ contacts, onCreateContact, onUpdateContact, onDeleteContact, onFavoriteContact, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, favorites, recent

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.phone?.includes(searchQuery) ||
                         contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'favorites' && contact.isFavorite) ||
                         (filterType === 'recent' && contact.isRecent);
    
    return matchesSearch && matchesFilter;
  });

  const handleCreateContact = () => {
    if (!newContact.name || !newContact.phone) return;

    const contact = {
      id: Date.now(),
      ...newContact,
      createdAt: new Date().toISOString(),
      isFavorite: false,
      isRecent: true
    };

    onCreateContact(contact);
    setNewContact({ name: '', phone: '', email: '', notes: '' });
    setShowCreateModal(false);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setNewContact({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setShowCreateModal(true);
  };

  const handleUpdateContact = () => {
    const updatedContact = {
      ...editingContact,
      ...newContact
    };

    onUpdateContact(updatedContact);
    setEditingContact(null);
    setNewContact({ name: '', phone: '', email: '', notes: '' });
    setShowCreateModal(false);
  };

  const handleToggleFavorite = (contactId) => {
    const contact = contacts.find(c => c._id === contactId);
    if (contact) {
      onFavoriteContact(contactId, !contact.isFavorite);
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
              <UserPlus size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Contacts</h2>
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

        {/* Search and Filter */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>
            <button
              onClick={() => setFilterType(filterType === 'all' ? 'favorites' : 'all')}
              className={`p-2 rounded-lg transition-all ${
                filterType === 'favorites' ? 'bg-[#00a884]/20 text-[#00a884]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Star size={20} fill={filterType === 'favorites' ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex gap-2">
            {['all', 'favorites', 'recent'].map(type => (
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

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredContacts.map(contact => (
              <motion.div
                key={contact._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-medium">
                      {contact.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{contact.name}</h3>
                      {contact.isFavorite && <Star size={14} className="text-yellow-500 fill-current" />}
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="text-gray-500 text-xs mt-2 line-clamp-1">{contact.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleFavorite(contact._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        contact.isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      <Star size={16} fill={contact.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteContact(contact._id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingContact(null);
              setNewContact({ name: '', phone: '', email: '', notes: '' });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Add Contact
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
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingContact(null);
                    setNewContact({ name: '', phone: '', email: '', notes: '' });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Name *</label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Contact name"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Phone *</label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Email (optional)</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="Email address"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Notes (optional)</label>
                  <textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={editingContact ? handleUpdateContact : handleCreateContact}
                  disabled={!newContact.name || !newContact.phone}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {editingContact ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Contact Settings Component
export const ContactSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <UserPlus size={18} className="text-[#00a884]" />
            Contact Management
          </p>
          <p className="text-gray-400 text-sm">Manage your contacts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, contactManagementEnabled: !settings.contactManagementEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.contactManagementEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.contactManagementEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.contactManagementEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-sync contacts</p>
              <p className="text-gray-400 text-xs">Sync with device contacts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSyncContacts: !settings.autoSyncContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSyncContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSyncContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show phone numbers</p>
              <p className="text-gray-400 text-xs">Display phone in contact list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showPhoneNumbers: !settings.showPhoneNumbers })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showPhoneNumbers ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showPhoneNumbers ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sort by</p>
              <p className="text-gray-400 text-xs">Contact list sorting</p>
            </div>
            <select
              value={settings.contactSortBy || 'name'}
              onChange={(e) => onUpdate({ ...settings, contactSortBy: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="name">Name</option>
              <option value="recent">Recent</option>
              <option value="favorites">Favorites</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Contact Card Component
export const ContactCard = ({ contact, onClick, onChat }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <span className="text-white text-xl font-medium">
            {contact.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold truncate">{contact.name}</h3>
            {contact.isFavorite && <Star size={14} className="text-yellow-500 fill-current flex-shrink-0" />}
          </div>
          <p className="text-gray-400 text-sm truncate">{contact.phone}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChat(contact);
          }}
          className="bg-[#00a884] text-white p-2 rounded-lg hover:bg-[#008f72] transition-colors"
        >
          <Phone size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default ContactManagement;
