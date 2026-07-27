import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Check, RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileDelete = ({ user, onDeleteAccount, onClose }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE') return;

    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeleting(false);

    if (onDeleteAccount) {
      onDeleteAccount(user._id);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-500" size={20} />
            <h3 className="text-white font-semibold">Delete Account</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!showConfirm ? (
          <>
            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="text-red-500 text-sm">
                  <p className="font-medium mb-2">Warning: This action cannot be undone</p>
                  <p className="opacity-80">
                    Deleting your account will permanently remove all your data including:
                  </p>
                  <ul className="mt-2 ml-4 list-disc space-y-1 opacity-80">
                    <li>All messages and conversations</li>
                    <li>Contacts and groups</li>
                    <li>Status updates and media</li>
                    <li>Account settings and preferences</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Lock size={24} className="text-[#00a884]" />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{user?.name || 'Unknown'}</p>
                  <p className="text-gray-400 text-sm">{user?.email || user?.phone}</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
                <p className="text-yellow-500 text-xs">
                  Make sure you have a backup of any important data before proceeding.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Delete My Account
            </button>
          </>
        ) : (
          <>
            {/* Confirmation */}
            <div className="mb-4">
              <p className="text-white mb-4">To confirm deletion, type <span className="text-red-500 font-bold">DELETE</span> below:</p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-red-500 focus:outline-none text-center font-mono"
              />
            </div>

            {/* Final Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-red-500 text-sm">
                  This is your last chance to cancel. Once you delete your account, there is no way to recover your data.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmationText('');
                }}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmationText !== 'DELETE'}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:bg-red-500/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// Delete Account Button Component
export const DeleteAccountButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
      title="Delete account"
    >
      <Trash2 size={18} />
    </button>
  );
};

export default ProfileDelete;
