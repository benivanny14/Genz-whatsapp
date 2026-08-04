import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Shield, AlertTriangle, CheckCircle, UserX } from 'lucide-react';

const StatusBlockPanel = ({ onClose, status, onBlock }) => {
  const [blockReason, setBlockReason] = useState('');
  const [blockChatsToo, setBlockChatsToo] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const blockReasons = [
    { id: 'spam', label: 'Spam or unwanted content' },
    { id: 'harassment', label: 'Harassment or abuse' },
    { id: 'inappropriate', label: 'Inappropriate content' },
    { id: 'fake', label: 'Fake account or scam' },
    { id: 'personal', label: 'Personal reasons' },
    { id: 'other', label: 'Other reason' }
  ];

  const handleBlock = async () => {
    if (!confirm('Are you sure you want to block this user? They will not be able to see your status updates.')) {
      return;
    }

    setIsBlocking(true);

    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          blockChatsToo,
          reason: blockReason
        })
      });

      const data = await response.json();
      if (data.success) {
        const blockData = {
          statusId: status?._id || status?.id,
          userId: status?.user?._id || status?.user?.id,
          username: status?.username,
          reason: blockReason,
          blockChatsToo,
          blockedAt: new Date().toISOString()
        };

        if (onBlock) {
          onBlock(blockData);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <UserX className="text-red-500" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Block User</h2>
              <p className="text-white/60 text-xs">Prevent user from seeing your status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Warning */}
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-400 font-medium mb-1">Warning</p>
              <p className="text-red-300 text-sm">Blocking this user will prevent them from seeing your status updates and contacting you.</p>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-white font-bold">
                {status?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-medium">{status?.username || 'Unknown'}</p>
                <p className="text-white/60 text-sm">This user will be blocked from your status</p>
              </div>
            </div>
          </div>

          {/* Block Chats Too */}
          <div className="bg-white/5 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={blockChatsToo}
                onChange={(e) => setBlockChatsToo(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#00a884] focus:ring-[#00a884]"
              />
              <div>
                <p className="text-white font-medium">Block Chats Too</p>
                <p className="text-white/60 text-xs">Also block this user from sending you messages</p>
              </div>
            </label>
          </div>

          {/* Block Reason */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Reason for Blocking</label>
            <div className="grid grid-cols-1 gap-2">
              {blockReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setBlockReason(reason.id)}
                  className={`p-3 rounded-xl text-left transition-colors ${
                    blockReason === reason.id
                      ? 'bg-red-500/20 border border-red-500 text-white'
                      : 'bg-white/10 border border-transparent text-white/70 hover:bg-white/20'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Additional Notes (Optional)</label>
            <textarea
              value={blockReason === 'other' ? blockReason : ''}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* What Happens */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Shield className="text-white/60 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white text-sm font-medium">What happens when blocked?</p>
                <ul className="text-white/60 text-xs mt-2 space-y-1">
                  <li>• User cannot see your status updates</li>
                  <li>• User cannot view your profile</li>
                  <li>• User cannot message you (if chats blocked)</li>
                  <li>• You can unblock anytime from settings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20 space-y-2">
          <button
            onClick={handleBlock}
            disabled={isBlocking}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBlocking ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Blocking...
              </>
            ) : (
              <>
                <UserX size={20} />
                Block User
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isBlocking}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBlockPanel;
