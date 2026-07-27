import React, { useState } from 'react';
import { Download, X, Check, RefreshCw, FileText, AlertTriangle, Clock, Calendar, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DataDownload = ({ user, onRequestDownload, onDownload, onClose }) => {
  const [requestDate, setRequestDate] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyForDownload, setReadyForDownload] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);

  const handleRequest = async () => {
    setIsRequesting(true);
    
    // Simulate request processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const now = new Date();
    setRequestDate(now);
    setExpiryDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)); // 3 days from now
    
    // Simulate data preparation (usually takes a few hours)
    setTimeout(() => {
      setReadyForDownload(true);
    }, 5000);
    
    setIsRequesting(false);

    if (onRequestDownload) {
      onRequestDownload();
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setDownloadProgress(i);
    }

    setIsDownloading(false);

    if (onDownload) {
      onDownload();
    }
  };

  const formatExpiry = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Download className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Download Your Data</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <FileText className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
            <p className="text-blue-500 text-xs">
              Request a copy of your account information including messages, contacts, and media. The download will be available for 3 days.
            </p>
          </div>
        </div>

        {/* Status */}
        {!requestDate ? (
          <div className="space-y-4">
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-medium">Account Data</p>
                  <p className="text-gray-400 text-xs">Messages, contacts, media</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <FileText size={12} />
                  <span>Chat history</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={12} />
                  <span>Contact list</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={12} />
                  <span>Media files</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={12} />
                  <span>Account settings</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRequest}
              disabled={isRequesting}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Requesting...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Request Data
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Request Status */}
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={20} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Request Status</p>
                  <p className="text-gray-400 text-xs">Requested on {requestDate.toLocaleDateString()}</p>
                </div>
              </div>

              {!readyForDownload ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="animate-spin text-[#00a884]" size={14} />
                    <span className="text-gray-400 text-sm">Preparing your data...</span>
                  </div>
                  <p className="text-gray-500 text-xs">This may take a few hours</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="text-[#00a884]" size={14} />
                    <span className="text-white text-sm">Ready for download</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-yellow-500" />
                    <span className="text-gray-400 text-xs">
                      Expires in {formatExpiry(expiryDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Download Progress */}
            {isDownloading && (
              <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Downloading...</span>
                  <span className="text-white text-sm">{downloadProgress}%</span>
                </div>
                <div className="w-full bg-[#1a2e35] rounded-full h-2">
                  <div
                    className="bg-[#00a884] h-2 rounded-full transition-all"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Button */}
            {readyForDownload && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download Data
                  </>
                )}
              </button>
            )}

            {/* Warning */}
            {readyForDownload && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-yellow-500 text-xs">
                    Your data will be available for download until {expiryDate?.toLocaleDateString()}. After that, you'll need to request again.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Data Download Settings Component
export const DataDownloadSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Download size={18} className="text-[#00a884]" />
            Data Download
          </p>
          <p className="text-gray-400 text-sm">Download your account data</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, dataDownloadEnabled: !settings.dataDownloadEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.dataDownloadEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.dataDownloadEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.dataDownloadEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include media</p>
              <p className="text-gray-400 text-xs">Download images and videos</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, downloadIncludeMedia: !settings.downloadIncludeMedia })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.downloadIncludeMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.downloadIncludeMedia ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include contacts</p>
              <p className="text-gray-400 text-xs">Download contact list</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, downloadIncludeContacts: !settings.downloadIncludeContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.downloadIncludeContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.downloadIncludeContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Data Download Button Component
export const DataDownloadButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Download your data"
    >
      <Download size={18} />
    </button>
  );
};

// Download Status Badge Component
export const DownloadStatusBadge = ({ status, expiryDate }) => {
  if (status === 'ready') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full text-xs"
      >
        <Check size={10} />
        <span>Ready</span>
      </motion.div>
    );
  }

  if (status === 'preparing') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full text-xs"
      >
        <RefreshCw className="animate-spin" size={10} />
        <span>Preparing</span>
      </motion.div>
    );
  }

  return null;
};

export default DataDownload;
