import React, { useState } from 'react';
import { Download, X, Check, FileText, RefreshCw, Calendar, Image as ImageIcon, Video, FileText as FileIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExportChat = ({ chat, onExport, onClose }) => {
  const [exportFormat, setExportFormat] = useState('txt'); // txt, pdf, json
  const [includeMedia, setIncludeMedia] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // all, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const formatOptions = [
    { value: 'txt', label: 'Plain Text (.txt)', icon: FileText },
    { value: 'pdf', label: 'PDF Document (.pdf)', icon: FileText },
    { value: 'json', label: 'JSON Data (.json)', icon: FileIcon }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setExportProgress(i);
    }

    setIsExporting(false);

    if (onExport) {
      onExport({
        chatId: chat._id,
        format: exportFormat,
        includeMedia,
        dateRange,
        startDate,
        endDate
      });
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
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Download className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Export Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Info */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-white font-medium">{chat.name}</p>
          <p className="text-gray-400 text-sm">{chat.messageCount || 0} messages</p>
        </div>

        {/* Export Format */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Export format</p>
          <div className="grid grid-cols-3 gap-2">
            {formatOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setExportFormat(option.value)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    exportFormat === option.value
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mx-auto mb-1" />
                  <span className="text-xs">{option.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Include Media */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white text-sm">Include media</p>
            <p className="text-gray-400 text-xs">Export images and videos</p>
          </div>
          <button
            onClick={() => setIncludeMedia(!includeMedia)}
            className={`w-12 h-6 rounded-full transition-all ${
              includeMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-all ${
                includeMedia ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Date Range */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Date range</p>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          >
            <option value="all">All messages</option>
            <option value="custom">Custom range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <p className="text-gray-400 text-xs mb-1">From</p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
              />
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">To</p>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Exporting...</span>
              <span className="text-white text-sm">{exportProgress}%</span>
            </div>
            <div className="w-full bg-[#0b141a] rounded-full h-2">
              <div
                className="bg-[#00a884] h-2 rounded-full transition-all"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Exporting...
            </>
          ) : (
            <>
              <Download size={18} />
              Export Chat
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Export Chat Settings Component
export const ExportChatSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Download size={18} className="text-[#00a884]" />
            Export Chats
          </p>
          <p className="text-gray-400 text-sm">Export chat history</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, exportChatsEnabled: !settings.exportChatsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.exportChatsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.exportChatsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.exportChatsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default format</p>
            <select
              value={settings.defaultExportFormat || 'txt'}
              onChange={(e) => onUpdate({ ...settings, defaultExportFormat: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="txt">Plain Text</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include media by default</p>
              <p className="text-gray-400 text-xs">Export attachments</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, exportIncludeMedia: !settings.exportIncludeMedia })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.exportIncludeMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.exportIncludeMedia ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export Chat Button Component
export const ExportChatButton = ({ onOpen, chat }) => {
  return (
    <button
      onClick={() => onOpen?.(chat)}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Export chat"
    >
      <Download size={18} />
    </button>
  );
};

// Export Progress Component
export const ExportProgress = ({ progress, format, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-[#00a884]" />
          <span className="text-white text-sm">Exporting chat...</span>
        </div>
        <span className="text-gray-400 text-xs uppercase">{format}</span>
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2 mb-2">
        <div
          className="bg-[#00a884] h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs">{progress}%</span>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-red-500 transition-colors text-xs"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

// Export Complete Component
export const ExportComplete = ({ filename, onOpen, onShare }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#00a884]/10 border border-[#00a884] rounded-lg p-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <Check size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">Export Complete</p>
          <p className="text-gray-400 text-sm">{filename}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="text-[#00a884] hover:text-white transition-colors"
            title="Open file"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={onShare}
            className="text-[#00a884] hover:text-white transition-colors"
            title="Share"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ExportChat;
