import React, { useState } from 'react';
import { Archive, ArchiveRestore, X, Check, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusArchive = ({ statuses, onArchive, onUnarchive, onClose }) => {
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const archivedStatuses = statuses.filter(s => s.isArchived);
  const activeStatuses = statuses.filter(s => !s.isArchived);

  const handleToggleStatus = (statusId) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleBulkArchive = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    selectedStatuses.forEach(statusId => onArchive?.(statusId));
    setSelectedStatuses([]);
  };

  const handleBulkUnarchive = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    selectedStatuses.forEach(statusId => onUnarchive?.(statusId));
    setSelectedStatuses([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Archive size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Archive Status</h2>
              <p className="text-gray-400 text-sm">{archivedStatuses.length} archived</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedStatuses.length > 0 && (
          <div className="p-4 bg-[#00a884]/10 border-b border-[#00a884]/20">
            <div className="flex items-center justify-between">
              <p className="text-[#00a884] text-sm">
                {selectedStatuses.length} status{selectedStatuses.length > 1 ? 'es' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkArchive}
                  disabled={isProcessing}
                  className="bg-[#00a884] text-white px-3 py-1 rounded-lg hover:bg-[#008f72] transition-colors text-sm disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  onClick={handleBulkUnarchive}
                  disabled={isProcessing}
                  className="bg-[#0b141a] text-white px-3 py-1 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm disabled:opacity-50"
                >
                  Unarchive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Active Statuses */}
          {activeStatuses.length > 0 && (
            <div className="mb-6">
              <p className="text-white font-medium mb-3">Active Statuses ({activeStatuses.length})</p>
              <div className="space-y-2">
                {activeStatuses.map(status => (
                  <div
                    key={status._id}
                    className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status._id)}
                      onChange={() => handleToggleStatus(status._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-12 h-12 rounded-lg bg-[#00a884]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {status.media ? (
                        <img
                          src={status.media}
                          alt="Status"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xs text-center px-2">{status.text?.substring(0, 20)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm line-clamp-1">{status.text || 'Media status'}</p>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                        <Clock size={10} />
                        <span>{new Date(status.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onArchive?.(status._id)}
                      className="text-gray-400 hover:text-[#00a884] transition-colors"
                      title="Archive"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived Statuses */}
          {archivedStatuses.length > 0 && (
            <div>
              <p className="text-white font-medium mb-3">Archived Statuses ({archivedStatuses.length})</p>
              <div className="space-y-2">
                {archivedStatuses.map(status => (
                  <div
                    key={status._id}
                    className="bg-[#0b141a]/50 rounded-lg p-3 border border-[#00a884]/20 flex items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status._id)}
                      onChange={() => handleToggleStatus(status._id)}
                      className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                    />
                    <div className="w-12 h-12 rounded-lg bg-[#00a884]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {status.media ? (
                        <img
                          src={status.media}
                          alt="Status"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xs text-center px-2">{status.text?.substring(0, 20)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm line-clamp-1">{status.text || 'Media status'}</p>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                        <Clock size={10} />
                        <span>Archived {new Date(status.archivedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onUnarchive?.(status._id)}
                      className="text-gray-400 hover:text-[#00a884] transition-colors"
                      title="Unarchive"
                    >
                      <ArchiveRestore size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statuses.length === 0 && (
            <div className="text-center py-8">
              <Archive className="text-gray-600 mx-auto mb-4" size={32} />
              <p className="text-gray-400">No statuses found</p>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="p-4 border-t border-[#00a884]/20 bg-yellow-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-yellow-500 text-xs">
              Archived statuses are hidden from your status feed but can be restored anytime.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Archive Button Component
export const ArchiveButton = ({ onClick, isArchived }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors ${
        isArchived ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'
      }`}
      title={isArchived ? 'Unarchive' : 'Archive'}
    >
      {isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
    </button>
  );
};

// Archive Badge Component
export const ArchiveBadge = ({ count }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
    >
      <Archive size={10} />
      <span>{count} archived</span>
    </motion.div>
  );
};

export default StatusArchive;
