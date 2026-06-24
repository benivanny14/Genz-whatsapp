import React, { useState, useRef } from 'react';
import { X, ArrowLeft, Camera, Check, Search, Users } from 'lucide-react';

const GroupCreation = ({ isOpen, onClose, contacts = [], onCreateGroup }) => {
  const [step, setStep] = useState(1); // 1: Select contacts, 2: Group info
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupIcon, setGroupIcon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(contact =>
    (contact.username || contact.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.phoneNumber || contact.phone)?.includes(searchQuery)
  );

  const toggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setGroupIcon(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedContacts.length === 0) return;
    
    setIsCreating(true);
    try {
      await onCreateGroup?.({
        name: groupName.trim(),
        description: groupDescription.trim(),
        icon: groupIcon,
        participants: selectedContacts
      });
      handleClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedContacts([]);
    setGroupName('');
    setGroupDescription('');
    setGroupIcon(null);
    setSearchQuery('');
    onClose();
  };

  const getContactInitials = (name) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  return (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div 
        className="bg-[#233138] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-400" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {step === 1 ? 'New Group' : 'Group Info'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Step 1: Select Contacts */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2 bg-[#202c33] border border-[#37404a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            {/* Selected Count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
              </span>
              {selectedContacts.length > 0 && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg transition-colors font-medium"
                >
                  Next
                </button>
              )}
            </div>

            {/* Contacts List */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No contacts found
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContacts.includes(contact.id)
                        ? 'bg-[#00a884]/20 border border-[#00a884]/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="relative">
                      {contact.profilePicture ? (
                        <img
                          src={contact.profilePicture}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                          {getContactInitials(contact.name)}
                        </div>
                      )}
                      {selectedContacts.includes(contact.id) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{contact.name}</p>
                      {contact.phone && (
                        <p className="text-sm text-gray-400 truncate">{contact.phone}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Group Info */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Group Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-600 overflow-hidden">
                  {groupIcon ? (
                    <img src={groupIcon} alt="Group icon" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={48} className="w-full h-full p-4 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center hover:bg-[#008f6f] transition-colors"
                >
                  <Camera size={16} className="text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={100}
                className="w-full px-4 py-3 bg-[#202c33] border border-[#37404a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            {/* Group Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Description (optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 bg-[#202c33] border border-[#37404a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884] resize-none"
              />
            </div>

            {/* Selected Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Participants ({selectedContacts.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedContacts.map((contactId) => {
                  const contact = contacts.find(c => c.id === contactId);
                  if (!contact) return null;
                  return (
                    <span
                      key={contactId}
                      className="px-3 py-1 bg-[#00a884]/20 text-[#00a884] rounded-full text-sm"
                    >
                      {contact.name}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 bg-[#202c33] hover:bg-[#37404a] text-white rounded-lg transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !groupName.trim() || selectedContacts.length === 0}
                className="flex-1 px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:bg-[#00a884]/50 text-white rounded-lg transition-colors font-medium"
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupCreation;