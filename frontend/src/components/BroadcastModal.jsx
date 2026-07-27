import React, { useMemo, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { X, Check, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

const BroadcastModal = ({ onClose, onCreated }) => {
  const { conversations, createBroadcast } = useChat();
  const { user } = useUser();
  const [listName, setListName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentUserId = String(user?._id || user?.id || '');
  const contacts = useMemo(() => {
    const uniqueMap = new Map();
    (conversations || []).forEach((conversation) => {
      (conversation?.participants || []).forEach((participant) => {
        const participantId = String(participant?._id || participant?.id || '');
        if (!participantId || participantId === currentUserId || uniqueMap.has(participantId)) return;
        uniqueMap.set(participantId, { ...participant, _id: participantId, id: participantId });
      });
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
      String(a.username || a.name || '').localeCompare(String(b.username || b.name || ''))
    );
  }, [conversations, currentUserId]);

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!listName.trim() || selectedUsers.length === 0) {
      toast.error("Enter a list name and select at least one recipient.");
      return;
    }
    setLoading(true);
    try {
      const result = await createBroadcast({
        name: listName.trim(),
        recipients: selectedUsers
      });
      if (result.success) {
        toast.success('Broadcast list created');
        onCreated?.();
        onClose();
      } else {
        toast.error(result.message || 'Failed to create broadcast list');
      }
    } catch (err) {
      toast.error('Failed to create broadcast list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
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
            {contacts.length === 0 && (
              <p className="text-sm text-dark-textSecondary text-center py-4">No contacts found. Start a chat first, then create a broadcast list.</p>
            )}
            {(contacts || []).map(contact => (
              <div
                key={contact._id}
                onClick={() => toggleUser(contact._id)}
                className="flex items-center justify-between p-3 hover:bg-dark-hover rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center font-bold text-primary-600">
                    {(contact?.username || contact?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-dark-text font-medium">{contact?.username || contact?.name || 'Unknown User'}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedUsers.includes(contact._id) ? 'bg-primary-600 border-primary-600' : 'border-dark-border'}`}>
                  {selectedUsers.includes(contact._id) && <Check size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !listName.trim() || selectedUsers.length === 0}
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
