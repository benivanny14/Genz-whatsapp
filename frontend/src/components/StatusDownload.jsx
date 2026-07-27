import React, { useState } from 'react';
import { Download, X, Check, RefreshCw, Image as ImageIcon, Video, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatusDownload = ({ status, statuses, onDownload, onClose }) => {
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleToggleStatus = (statusId) => {
    setSelectedStatuses(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setDownloadProgress(i);
    }

    setIsDownloading(false);

    const statusesToDownload = status ? [status._id] : selectedStatuses;
    statusesToDownload.forEach(statusId => {
      onDownload?.(statusId);
    });

    setSelectedStatuses([]);
    onClose();
  };

  const getStatusIcon = (status) => {
    if (status.type === 'image') return <ImageIcon size={16} className="text-[#00a884]" />;
    if (status.type === 'video') return <Video size={16} className="text-[#00a884]" />;
    return <FileText size={16} className="text-gray-400" />;
  };

  const statusesToDownload = status ? [status] : statuses.filter(s => selectedStatuses.includes(s._id));

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
            <Download className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Download Status</h3>
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
            <p className="text-gray-400 text-sm mb-2">Select statuses to download</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {statuses.map(statusItem => (
                <button
                  key={statusItem._id}
                  onClick={() => handleToggleStatus(statusItem._id)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                    selectedStatuses.includes(statusItem._id)
                      ? 'border-[#00a884] bg-[#00a884]/10'
                      : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(statusItem._id)}
                    onChange={() => handleToggleStatus(statusItem._id)}
                    className="w-4 h-4 rounded border-[#00a884]/30 bg-[#0b141a] text-[#00a884] focus:ring-[#00a884]"
                  />
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
                    <div className="flex items-center gap-2">
                      {getStatusIcon(statusItem)}
                      <p className="text-white text-sm line-clamp-1">{statusItem.text || 'Media status'}</p>
                    </div>
                    <p className="text-gray-400 text-xs">{new Date(statusItem.createdAt).toLocaleDateString()}</p>
                  </div>
                  {selectedStatuses.includes(statusItem._id) && <Check size={18} className="text-[#00a884]" />}
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
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <p className="text-white text-sm line-clamp-1">{status.text || 'Media status'}</p>
            </div>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm">Downloading...</span>
              <span className="text-gray-400 text-xs">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-[#0b141a] rounded-full h-2">
              <motion.div
                className="bg-[#00a884] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mb-4 bg-[#00a884]/10 border border-[#00a884]/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-[#00a884] flex-shrink-0 mt-0.5" size={14} />
            <p className="text-[#00a884] text-xs">
              Downloaded statuses will be saved to your device's gallery or downloads folder.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isDownloading}
            className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading || (!status && selectedStatuses.length === 0)}
            className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDownloading ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Downloading...
              </>
            ) : (
              <>
                <Download size={18} />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Download Button Component
export const DownloadButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Download"
    >
      <Download size={18} />
    </button>
  );
};

export default StatusDownload;
