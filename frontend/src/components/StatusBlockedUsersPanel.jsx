import { getAuthToken } from '../utils/tokenStore';
import React, { useState, useEffect, useCallback } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, ShieldOff, Shield, UserX, RefreshCw } from 'lucide-react';

// Lists everyone the current user blocked from status updates and lets them
// unblock. Needed because blocked posters vanish from the feed, so there is no
// row to open the block panel from again.
const StatusBlockedUsersPanel = ({ onClose, onChanged }) => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      const res = await fetch(`${resolveApiBase()}/status-advanced/blocked-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBlockedUsers(data.blockedUsers || []);
      } else {
        setError(data.message || 'Failed to load blocked users');
      }
    } catch (e) {
      setError('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnblock = async (userId) => {
    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status-advanced/${encodeURIComponent(userId)}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError('Failed to unblock user');
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <ShieldOff className="text-red-400" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Blocked From Status</h2>
              <p className="text-white/60 text-xs">Users whose status updates you blocked</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-white/60 py-8">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {!loading && error && (
            <p className="text-red-400 text-sm text-center py-6">{error}</p>
          )}
          {!loading && !error && blockedUsers.length === 0 && (
            <p className="text-white/60 text-sm text-center py-8">
              No users blocked from status.
            </p>
          )}
          {blockedUsers.map((u) => (
            <div key={u._id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                {u.profilePicture ? (
                  <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  (u.username || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{u.username || 'Unknown'}</p>
                {u.reason && (
                  <p className="text-white/50 text-xs truncate">Reason: {u.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(u._id)}
                className="px-3 py-1.5 bg-white/10 hover:bg-[#00a884]/30 rounded-lg text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Unblock from status"
              >
                <Shield size={14} />
                Unblock
              </button>
            </div>
          ))}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBlockedUsersPanel;
