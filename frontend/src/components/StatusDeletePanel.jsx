import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const StatusDeletePanel = ({ onClose, status, onDelete }) => {
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  const deleteReasons = [
    { id: 'mistake', label: 'Posted by mistake' },
    { id: 'inappropriate', label: 'Content is inappropriate' },
    { id: 'duplicate', label: 'Duplicate status' },
    { id: 'old', label: 'Outdated content' },
    { id: 'other', label: 'Other reason' }
  ];

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status/${status?._id || status?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const deleteData = {
        statusId: status?._id || status?.id,
        reason: deleteReason,
        deleteForEveryone,
        deletedAt: new Date().toISOString()
      };

      if (onDelete) {
        onDelete(deleteData);
      }
      onClose();
    } catch (error) {
      console.error('Error deleting status:', error);
      alert('Failed to delete status. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Trash2 className="text-red-500" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Delete Status</h2>
              <p className="text-white/60 text-xs">Remove this status permanently</p>
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
              <p className="text-red-300 text-sm">This action cannot be undone. Once deleted, the status will be permanently removed.</p>
            </div>
          </div>

          {/* Status Preview */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white/60 text-xs mb-2 uppercase">Status to Delete</p>
            <p className="text-white text-sm">{status?.content || status?.caption || 'No content'}</p>
            <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
              <span>Type: {status?.type || 'unknown'}</span>
              <span>•</span>
              <span>{new Date(status?.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Delete for Everyone */}
          <div className="bg-white/5 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteForEveryone}
                onChange={(e) => setDeleteForEveryone(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/10 text-[#00a884] focus:ring-[#00a884]"
              />
              <div>
                <p className="text-white font-medium">Delete for Everyone</p>
                <p className="text-white/60 text-xs">Remove from all viewers' devices</p>
              </div>
            </label>
          </div>

          {/* Delete Reason */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Reason for Deletion (Optional)</label>
            <div className="grid grid-cols-1 gap-2">
              {deleteReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setDeleteReason(reason.id)}
                  className={`p-3 rounded-xl text-left transition-colors ${
                    deleteReason === reason.id
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
              value={deleteReason === 'other' ? deleteReason : ''}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20 space-y-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={20} />
                Delete Status
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDeletePanel;
