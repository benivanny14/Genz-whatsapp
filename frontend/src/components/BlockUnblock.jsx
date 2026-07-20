import React, { useState } from 'react';
import { Shield, X, Ban, Check, AlertTriangle, UserX, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BlockUnblock = ({ user, onBlock, onUnblock, onClose }) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBlock = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsBlocking(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (onBlock) {
      onBlock(user._id);
    }
    
    setIsBlocking(false);
    setShowConfirm(false);
    onClose();
  };

  const handleUnblock = async () => {
    setIsUnblocking(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (onUnblock) {
      onUnblock(user._id);
    }
    
    setIsUnblocking(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a2e35] rounded-2xl p-6 shadow-xl border border-[#00a884]/30 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="text-[#00a884]" size={20} />
          <h3 className="text-white font-semibold">Block Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-[#0b141a] rounded-lg">
        <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <span className="text-white text-xl font-medium">
            {user.name?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-white font-medium">{user.name}</p>
          <p className="text-gray-400 text-sm">{user.phone}</p>
        </div>
      </div>

      {!user.isBlocked ? (
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-red-500 text-sm font-medium">Blocking this user will:</p>
                <ul className="text-red-400 text-xs mt-2 space-y-1 list-disc list-inside">
                  <li>Stop them from sending you messages</li>
                  <li>Hide their status updates</li>
                  <li>Remove them from your contacts</li>
                  <li>They won't know they've been blocked</li>
                </ul>
              </div>
            </div>
          </div>

          {!showConfirm ? (
            <button
              onClick={handleBlock}
              disabled={isBlocking}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBlocking ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Blocking...
                </>
              ) : (
                <>
                  <Ban size={18} />
                  Block User
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-white text-sm text-center">Are you sure you want to block this user?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-[#0b141a] text-gray-400 py-2 rounded-lg hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlock}
                  disabled={isBlocking}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBlocking ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Blocking...
                    </>
                  ) : (
                    'Yes, Block'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Check className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-green-500 text-sm font-medium">User is currently blocked</p>
                <p className="text-green-400 text-xs mt-2">
                  Unblock to restore messaging and status visibility
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleUnblock}
            disabled={isUnblocking}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUnblocking ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Unblocking...
              </>
            ) : (
              <>
                <Check size={18} />
                Unblock User
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Block Button Component
export const BlockButton = ({ user, onBlock, onUnblock }) => {
  const [showBlockModal, setShowBlockModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowBlockModal(true)}
        className={`p-2 rounded-full transition-colors ${
          user.isBlocked
            ? 'text-green-500 hover:bg-green-500/10'
            : 'text-red-500 hover:bg-red-500/10'
        }`}
        title={user.isBlocked ? 'Unblock user' : 'Block user'}
      >
        {user.isBlocked ? <Shield size={16} /> : <Ban size={16} />}
      </button>

      <AnimatePresence>
        {showBlockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <BlockUnblock
              user={user}
              onBlock={(userId) => {
                onBlock(userId);
                setShowBlockModal(false);
              }}
              onUnblock={(userId) => {
                onUnblock(userId);
                setShowBlockModal(false);
              }}
              onClose={() => setShowBlockModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Blocked User Indicator Component
export const BlockedUserIndicator = ({ blockedAt }) => {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <Ban size={16} className="text-red-500" />
        <p className="text-red-500 text-sm">You blocked this user</p>
      </div>
      {blockedAt && (
        <p className="text-red-400 text-xs mt-1">
          Blocked {new Date(blockedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

// Block Settings Component
export const BlockSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Block Users
          </p>
          <p className="text-gray-400 text-sm">Block unwanted contacts</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, blockUsersEnabled: !settings.blockUsersEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.blockUsersEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.blockUsersEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.blockUsersEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Block unknown numbers</p>
              <p className="text-gray-400 text-xs">Auto-block from unknown contacts</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, blockUnknownNumbers: !settings.blockUnknownNumbers })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.blockUnknownNumbers ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.blockUnknownNumbers ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Report when blocking</p>
              <p className="text-gray-400 text-xs">Send spam report to WhatsApp</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reportWhenBlocking: !settings.reportWhenBlocking })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reportWhenBlocking ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reportWhenBlocking ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Hide blocked contacts</p>
              <p className="text-gray-400 text-xs">Don't show blocked in contact list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hideBlockedContacts: !settings.hideBlockedContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hideBlockedContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hideBlockedContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Blocked Users List Component
export const BlockedUsersList = ({ blockedUsers, onUnblock }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <UserX size={18} className="text-red-500" />
        Blocked Users ({blockedUsers.length})
      </h3>

      <div className="space-y-2">
        {blockedUsers.map(user => (
          <motion.div
            key={user._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <Ban size={18} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-gray-400 text-xs">{user.phone}</p>
            </div>
            <button
              onClick={() => onUnblock(user._id)}
              className="text-[#00a884] hover:text-white transition-colors"
            >
              Unblock
            </button>
          </motion.div>
        ))}
      </div>

      {blockedUsers.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Shield className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No blocked users</p>
        </div>
      )}
    </div>
  );
};

export default BlockUnblock;
