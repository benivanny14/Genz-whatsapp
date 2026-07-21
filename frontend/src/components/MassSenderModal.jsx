import React, { useState, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useUser } from '../context/UserContext';
import { X, Check, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const MassSenderModal = ({ onClose }) => {
  const { conversations = [], sendMassMessage } = useChat();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const contacts = useMemo(() => {
    const uniqueMap = new Map();
    conversations?.forEach(c => {
      c.participants?.forEach(p => {
        if (p._id !== user?.id && !uniqueMap.has(p._id)) {
          uniqueMap.set(p._id, p);
        }
      });
    });
    return Array.from(uniqueMap.values());
  }, [conversations, user?.id]);

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUsers.length === contacts.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers((contacts || []).map(c => c._id));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || selectedUsers.length === 0) {
      toast.error("Please write a message and select at least one person.");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendMassMessage(selectedUsers, message);
      if (result?.success) {
        const failedNote = result.failedCount ? ` (${result.failedCount} not reached)` : '';
        toast.success(`Message sent to ${result.sentCount ?? selectedUsers.length} people!${failedNote}`);
        onClose();
      } else {
        toast.error(result?.error || "Failed to send message. Try again.");
      }
    } catch (error) {
      toast.error("Failed to send message. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Send size={20} />
            <h2 className="font-bold text-lg">Mass Message Sender</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <textarea
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-32 bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-primary-500 resize-none"
          />
          <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-dark-textSecondary uppercase font-bold block">Select Recipients</label>
              {contacts.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-xs text-primary-500 hover:underline font-medium"
                >
                  {selectedUsers.length === contacts.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            {contacts.length === 0 && <p className="text-sm text-dark-textSecondary text-center py-4">No contacts found.</p>}
            {(contacts || []).map(contact => (
              <div
                key={contact._id}
                onClick={() => toggleUser(contact._id)}
                className="flex items-center justify-between p-2 hover:bg-dark-hover rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center text-primary-600 font-bold">
                    {contact?.username?.charAt(0) || '?'}
                  </div>
                  <span className="text-dark-text text-sm">{contact?.username || 'Unknown User'}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedUsers.includes(contact._id) ? 'bg-primary-600 border-primary-600' : 'border-dark-border'}`}>
                  {selectedUsers.includes(contact._id) && <Check size={14} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim() || selectedUsers.length === 0}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isSending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isSending ? 'Sending...' : `Send to ${selectedUsers.length} People`}
          </button>
        </div>
      </div>
    </div>
  );
};
export default MassSenderModal;
