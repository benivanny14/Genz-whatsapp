import React, { useState } from 'react';
import { X, Forward, Search, Users, CheckCircle, Send } from 'lucide-react';

const StatusForwardPanel = ({ onClose, status, onForward }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const mockContacts = [
    { id: 1, name: 'John Doe', avatar: 'JD', online: true },
    { id: 2, name: 'Jane Smith', avatar: 'JS', online: false },
    { id: 3, name: 'Mike Johnson', avatar: 'MJ', online: true },
    { id: 4, name: 'Sarah Williams', avatar: 'SW', online: false },
    { id: 5, name: 'David Brown', avatar: 'DB', online: true }
  ];

  const mockGroups = [
    { id: 1, name: 'Family Group', members: 12 },
    { id: 2, name: 'Work Team', members: 8 },
    { id: 3, name: 'Friends', members: 15 },
    { id: 4, name: 'Project X', members: 5 }
  ];

  const filteredContacts = mockContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleGroup = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleForward = async () => {
    if (selectedContacts.length === 0 && selectedGroups.length === 0) {
      alert('Please select at least one contact or group');
      return;
    }

    setIsForwarding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contacts: selectedContacts,
          groups: selectedGroups,
          message: ''
        })
      });

      const data = await response.json();
      if (data.success) {
        const forwardData = {
          statusId: status?._id || status?.id,
          contacts: selectedContacts,
          groups: selectedGroups,
          forwardedAt: new Date().toISOString()
        };

        if (onForward) {
          onForward(forwardData);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error forwarding status:', error);
      alert('Failed to forward status. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  const totalSelected = selectedContacts.length + selectedGroups.length;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Forward className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Forward Status</h2>
              <p className="text-white/60 text-xs">Share with contacts and groups</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Status to Forward</p>
            <p className="text-white text-sm">{status?.content || status?.caption || 'No content'}</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts or groups..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Selected Count */}
          {totalSelected > 0 && (
            <div className="bg-[#00a884]/20 border border-[#00a884]/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-white text-sm">{totalSelected} selected</span>
              <button
                onClick={() => {
                  setSelectedContacts([]);
                  setSelectedGroups([]);
                }}
                className="text-[#00a884] text-sm hover:text-[#008f6f]"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Groups */}
          <div>
            <label className="text-white/60 text-xs mb-2 block flex items-center gap-2">
              <Users size={14} />
              Groups
            </label>
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${
                    selectedGroups.includes(group.id)
                      ? 'bg-[#00a884]/20 border border-[#00a884]'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                      <Users size={18} className="text-[#00a884]" />
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{group.name}</p>
                      <p className="text-white/60 text-xs">{group.members} members</p>
                    </div>
                  </div>
                  {selectedGroups.includes(group.id) && (
                    <CheckCircle className="text-[#00a884]" size={18} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Contacts</label>
            <div className="space-y-2">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-colors ${
                    selectedContacts.includes(contact.id)
                      ? 'bg-[#00a884]/20 border border-[#00a884]'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center text-white font-bold">
                        {contact.avatar}
                      </div>
                      {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a2e35]" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">{contact.name}</p>
                      <p className="text-white/60 text-xs">{contact.online ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  {selectedContacts.includes(contact.id) && (
                    <CheckCircle className="text-[#00a884]" size={18} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20 space-y-2">
          <button
            onClick={handleForward}
            disabled={totalSelected === 0}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Forward size={20} />
            Forward to {totalSelected} {totalSelected === 1 ? 'recipient' : 'recipients'}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusForwardPanel;
