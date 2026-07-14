import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { X, Check, Megaphone } from 'lucide-react';

const BroadcastModal = ({ onClose, onCreated }) => {
  const { conversations, createBroadcast } = useChat();
  const { user } = useUser();
  const [listName, setListName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get unique contacts from conversations
  const contacts = Array.from(new Set(conversations.flatMap(c =>
    (c?.participants || []).filter(p => p._id !== user?.id)
  ).map(p => JSON.stringify(p)))).map(p => JSON.parse(p));

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!listName.trim() || selectedUsers.length === 0) {
      alert("Enter a list name and select at least one recipient.");
      return;
    }
    setLoading(true);
    try {
      const result = await createBroadcast({
        name: listName,
        recipients: selectedUsers
      });
      if (result.success) {
        onCreated?.();
        onClose();
      } else {
        alert(result.message || 'Failed to create broadcast list');
      }
    } catch (err) {
      alert('Failed to create broadcast list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Megaphone size={20} />
            <h2 className="font-bold text-lg">New Broadcast</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-1 block">List Name</label>
            <input
              type="text"
              placeholder="Enter list name..."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-2 text-dark-text focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto pr-2 scrollbar-thin">
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-2 block">Select Recipients</label>
            {(contacts || []).map(contact => (
              <div
                key={contact._id}
                onClick={() => toggleUser(contact._id)}
                className="flex items-center justify-between p-3 hover:bg-dark-hover rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center font-bold text-primary-600">
                    {(contact?.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-dark-text font-medium">{contact?.username || 'Unknown User'}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedUsers.includes(contact._id) ? 'bg-primary-600 border-primary-600' : 'border-dark-border'}`}>
                  {selectedUsers.includes(contact._id) && <Check size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : `Create Broadcast List (${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BroadcastModal;
