import React, { useState } from 'react';
import { X, MessageSquare, Clock, FileText, Download, Upload, Bot, Calendar } from 'lucide-react';

const AdvancedChatFeaturesPanel = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('autoreply');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [importSource, setImportSource] = useState('');
  const [exportFormat, setExportFormat] = useState('html');

  const tabs = [
    { id: 'autoreply', icon: Bot, label: 'Auto-Reply' },
    { id: 'scheduler', icon: Calendar, label: 'Scheduler' },
    { id: 'import', icon: Upload, label: 'Import' },
    { id: 'export', icon: Download, label: 'Export' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        autoReplyEnabled,
        autoReplyMessage,
        scheduledMessages,
        importSource,
        exportFormat
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Advanced Chat Features</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00a884] text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'autoreply' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-[#00a884]" />
                    <h3 className="text-white font-medium">Auto-Reply per Chat</h3>
                  </div>
                  <button
                    onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      autoReplyEnabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-2">Auto-Reply Message</p>
                  <textarea
                    value={autoReplyMessage}
                    onChange={(e) => setAutoReplyMessage(e.target.value)}
                    placeholder="Enter your auto-reply message..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
                  />
                </div>

                <div className="mt-4">
                  <p className="text-white/70 text-sm mb-2">Apply to Chats</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span>All chats</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" className="rounded" />
                      <span>Selected chats only</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" className="rounded" />
                      <span>Groups only</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scheduler' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Message Scheduler</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Recipient</p>
                    <input
                      type="text"
                      placeholder="Select contact or group"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                    />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-2">Message</p>
                    <textarea
                      placeholder="Type your message..."
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
                    />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-2">Schedule Date & Time</p>
                    <input
                      type="datetime-local"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                  <button className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium">
                    Schedule Message
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Scheduled Messages</h3>
                {scheduledMessages.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-4">No scheduled messages</p>
                ) : (
                  <div className="space-y-2">
                    {scheduledMessages.map((msg) => (
                      <div key={msg.id} className="bg-white/5 rounded-lg p-3">
                        <p className="text-white text-sm">{msg.message}</p>
                        <p className="text-white/40 text-xs mt-1">{msg.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Upload size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Import Chats</h3>
                </div>

                <div className="space-y-4">
                  <button className="w-full px-4 py-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-mediumflex items-center justify-center gap-3">
                    <FileText size={24} />
                    <div className="text-left">
                      <p>Import from WhatsApp</p>
                      <p className="text-white/50 text-sm">Import chat history from WhatsApp backup</p>
                    </div>
                  </button>

                  <button className="w-full px-4 py-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-3">
                    <Bot size={24} />
                    <div className="text-left">
                      <p>Import from MODs</p>
                      <p className="text-white/50 text-sm">Import from WhatsApp MODs (GBWhatsApp, FMWhatsApp, etc.)</p>
                    </div>
                  </button>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white/70 text-sm mb-2">Or upload backup file</p>
                    <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                      <Upload size={32} className="text-white/50" />
                      <span className="text-white/70">Click to upload or drag and drop</span>
                      <span className="text-white/40 text-xs">Supports .db, .crypt12, .msgstore</span>
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Download size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Export Chats</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Export Format</p>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20"
                    >
                      <option value="html">HTML (Web View)</option>
                      <option value="txt">Plain Text</option>
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span>Include media files</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span>Include timestamps</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input type="checkbox" className="rounded" />
                      <span>Export all chats</span>
                    </label>
                  </div>

                  <button className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2">
                    <Download size={18} />
                    Export Chats
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Export Options</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <FileText size={16} />
                    Export to HTML (with Media)
                  </button>
                  <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <FileText size={16} />
                    Export to HTML (Text Only)
                  </button>
                  <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <Download size={16} />
                    Export with Media (ZIP)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedChatFeaturesPanel;
