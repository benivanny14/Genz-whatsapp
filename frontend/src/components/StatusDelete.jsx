import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusDelete = ({ status, statuses, onDelete, onClose }) => {
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggleStatus = (statusId) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsDeleting(false);

    const statusesToDelete = status ? [status._id] : selectedStatuses;
    statusesToDelete.forEach(statusId => {
      onDelete?.(statusId);
    });

    setSelectedStatuses([]);
    setShowConfirm(false);
    onClose();
  };

  const handleConfirm = () => {
    setShowConfirm(true);
  };

  const statusesToDelete = status ? [status] : statuses.filter(s => selectedStatuses.includes(s._id));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        {!showConfirm ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Trash2 className="text-red-500" size={20} />
                <h3 className="text-white font-semibold">Delete Status</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {!status && (
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Select statuses to delete</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statuses.map(statusItem => (
                    <button
                      key={statusItem._id}
                      onClick={() => handleToggleStatus(statusItem._id)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                        selectedStatuses.includes(statusItem._id)
                          ? 'border-red-500 bg-red-500/10'
                          : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#00a884]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {statusItem.media ? (
                          <img
                            src={statusItem.media}
                            alt="Status"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-xs text-center px-2">{statusItem.text?.substring(0, 20)}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm line-clamp-1">{statusItem.text || 'Media status'}</p>
                        <p className="text-gray-400 text-xs">{new Date(statusItem.createdAt).toLocaleDateString()}</p>
                      </div>
                      {selectedStatuses.includes(statusItem._id) && <Check size={18} className="text-red-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {status && (
              <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
                <div className="w-16 h-24 rounded-lg bg-[#00a884]/20 flex items-center justify-center overflow-hidden mb-2">
                  {status.media ? (
                    <img
                      src={status.media}
                      alt="Status"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs text-center px-2">{status.text?.substring(0, 30)}</span>
                  )}
                </div>
                <p className="text-white text-sm line-clamp-1">{status.text || 'Media status'}</p>
              </div>
            )}

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-red-500 text-xs">
                  This action cannot be undone. The status will be permanently deleted.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting || (!status && selectedStatuses.length === 0)}
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
                    Delete
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                <h3 className="text-white font-semibold">Confirm Delete</h3>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-white mb-2">
                Are you sure you want to delete {status ? 'this status' : `${selectedStatuses.length} status(es)`}?
              </p>
              <p className="text-gray-400 text-sm">
                This action cannot be undone and the status will be permanently removed.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
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

// Delete Button Component
export const DeleteButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
      title="Delete"
    >
      <Trash2 size={18} />
    </button>
  );
};

export default StatusDelete;
