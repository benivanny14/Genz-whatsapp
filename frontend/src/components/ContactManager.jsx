import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { X, UserPlus, Search, UserMinus, Phone, MessageSquare, Edit } from 'lucide-react';

const ContactManager = ({ onClose }) => {
  const { contacts, addContact, removeContact, updateContact } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });

  const filteredContacts = (contacts || []).filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const handleAddContact = () => {
    if (newContact.name) {
      addContact({
        _id: 'c' + Date.now(),
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email
      });
      setNewContact({ name: '', phone: '', email: '' });
      setShowAddForm(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <UserPlus size={20} />
            <h2 className="font-bold text-lg">Contact Manager</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-textSecondary" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg pl-10 pr-4 py-2 text-dark-text focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg"
            >
              <UserPlus size={20} />
            </button>
          </div>

          {showAddForm && (
            <div className="bg-dark-bg p-4 rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-2 text-dark-text"
              />
              <input
                type="text"
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-2 text-dark-text"
              />
              <input
                type="email"
                placeholder="Email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-lg p-2 text-dark-text"
              />
              <div className="flex gap-2">
                <button onClick={handleAddContact} className="flex-1 bg-primary-600 text-white py-2 rounded-lg">Add</button>
                <button onClick={() => setShowAddForm(false)} className="flex-1 bg-dark-bg text-dark-text py-2 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {(filteredContacts || []).map(contact => (
              <div key={contact._id} className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center font-bold text-primary-600">
                    {contact.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-dark-text font-medium">{contact.name}</p>
                    <p className="text-xs text-dark-textSecondary">{contact.phone || contact.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-dark-hover rounded-lg text-primary-500">
                    <Phone size={16} />
                  </button>
                  <button className="p-2 hover:bg-dark-hover rounded-lg text-primary-500">
                    <MessageSquare size={16} />
                  </button>
                  <button className="p-2 hover:bg-dark-hover rounded-lg text-dark-textSecondary">
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => removeContact(contact._id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactManager;
