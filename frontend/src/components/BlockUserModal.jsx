import React from 'react';
import { useChat } from '../context/ChatContext';
import { X, ShieldAlert, ShieldCheck } from 'lucide-react';

const BlockUserModal = ({ userId, username, onClose }) => {
  const { blockUser, unblockUser, blockedUsers } = useChat();
  const isBlocked = blockedUsers.includes(userId);

  const handleToggle = () => {
    if (isBlocked) {
      unblockUser(userId);
    } else {
      blockUser(userId);
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            {isBlocked ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            <h2 className="font-bold text-lg">{isBlocked ? 'Unblock User' : 'Block User'}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-6">
          <p className="text-dark-text mb-6">
            {isBlocked
              ? `Do you want to unblock ${username}? They will be able to message you again.`
              : `Do you want to block ${username}? They won't be able to message you anymore.`
            }
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-dark-bg hover:bg-dark-hover text-dark-text font-bold py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleToggle}
              className={`flex-1 font-bold py-3 rounded-xl transition-colors ${isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
            >
              {isBlocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
