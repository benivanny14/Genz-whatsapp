import React, { useState } from 'react';
import { Download, FileText, Send, Type, Eye, MessageSquare, Trash2, Sparkles, Repeat, FileDigit, Image } from 'lucide-react';
import { exportChat, sendBulkMessage, applyTextStyle, getBlankMessage, repeatText, watchUserOnline, generateFakeChat, clearAllChats, getTextStyles, downloadStatus } from '../utils/quickActions';
import toast from 'react-hot-toast';

const QuickActionsMenu = ({ conversationId, peerUserId, peerUsername, onClose }) => {
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFakeModal, setShowFakeModal] = useState(false);
  const [showTextToolsSubmenu, setShowTextToolsSubmenu] = useState(false);
  const [textToolInput, setTextToolInput] = useState('');
  const [repeatCount, setRepeatCount] = useState(5);
  const [blankSpaces, setBlankSpaces] = useState(3);
  const [bulkContent, setBulkContent] = useState('');
  const [fakeFriendName, setFakeFriendName] = useState('');
  const [fakeMessageCount, setFakeMessageCount] = useState(10);

  const handleExport = (format) => {
    exportChat(conversationId, format);
    onClose?.();
  };

  const handleBulkSend = async () => {
    if (!bulkContent.trim()) return;
    await sendBulkMessage({ 
      userIds: peerUserId ? [peerUserId] : [], 
      content: bulkContent 
    });
    setShowBulkModal(false);
    setBulkContent('');
    onClose?.();
  };

  const handleFakeChat = async () => {
    if (!fakeFriendName.trim()) return;
    await generateFakeChat(fakeFriendName, fakeMessageCount);
    setShowFakeModal(false);
    setFakeFriendName('');
    onClose?.();
  };

  const handleWatchOnline = () => {
    if (peerUserId) {
      watchUserOnline(peerUserId);
      toast.success(`Watching ${peerUsername || 'user'} online status 👀`);
    }
    onClose?.();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL chats? This cannot be undone!')) {
      await clearAllChats();
      window.location.reload();
    }
    onClose?.();
  };

  if (showExportSubmenu) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-[#1f2c33] rounded-xl w-80 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold mb-3">📥 Export Chat As...</h3>
          <div className="space-y-2">
            <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <FileText size={18} className="text-blue-400" /> Plain Text (.txt)
            </button>
            <button onClick={() => handleExport('html')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <FileText size={18} className="text-orange-400" /> Web Page (.html)
            </button>
            <button onClick={() => handleExport('json')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
              <FileText size={18} className="text-green-400" /> JSON Data (.json)
            </button>
            <button onClick={() => setShowExportSubmenu(false)} className="w-full text-center text-gray-400 py-2 text-sm hover:text-white">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showBulkModal) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold mb-3">📨 Mass Message</h3>
          <textarea value={bulkContent} onChange={e => setBulkContent(e.target.value)} placeholder="Write message to send..." className="w-full bg-[#0b141a] text-white border border-white/10 rounded-lg p-3 h-24 resize-none mb-3" />
          <div className="flex gap-2">
            <button onClick={handleBulkSend} className="flex-1 bg-[#00a884] text-white py-2 rounded-lg font-bold hover:bg-[#008f72] transition-colors">
              <Send size={16} className="inline mr-1" /> Send
            </button>
            <button onClick={() => { setShowBulkModal(false); setBulkContent(''); }} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (showTextToolsSubmenu) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold mb-3">🔤 Text Tools</h3>
          <textarea value={textToolInput} onChange={e => setTextToolInput(e.target.value)} placeholder="Enter text here..." className="w-full bg-[#0b141a] text-white border border-white/10 rounded-lg p-3 h-20 resize-none mb-3" />
          <div className="space-y-2 mb-3">
            <button onClick={async () => { const r = await applyTextStyle(textToolInput, 'stylish', 'bold'); setTextToolInput(r); toast.success('Text styled!'); }} className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm">
              ✨ Stylish Text (Bold/Italic/Serif)
            </button>
            <div className="flex gap-2 items-center">
              <input type="number" min="1" max="20" value={repeatCount} onChange={e => setRepeatCount(Number(e.target.value))} className="w-16 bg-[#0b141a] text-white border border-white/10 rounded-lg p-2 text-sm" />
              <button onClick={async () => { const r = await repeatText(textToolInput, repeatCount); setTextToolInput(r); toast.success(`Repeated ${repeatCount}x`); }} className="flex-1 text-left px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm">
                <Repeat size={14} className="inline mr-1" /> Repeat Text
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" min="1" max="10" value={blankSpaces} onChange={e => setBlankSpaces(Number(e.target.value))} className="w-16 bg-[#0b141a] text-white border border-white/10 rounded-lg p-2 text-sm" />
              <button onClick={async () => { const r = await getBlankMessage(blankSpaces); setTextToolInput(r); toast.success('Blank message generated'); }} className="flex-1 text-left px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm">
                <FileDigit size={14} className="inline mr-1" /> Blank Message
              </button>
            </div>
          </div>
          <button onClick={() => setShowTextToolsSubmenu(false)} className="w-full text-center text-gray-400 py-2 text-sm hover:text-white">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (showFakeModal) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
          <h3 className="text-white font-bold mb-3">🎭 Generate Fake Chat</h3>
          <input value={fakeFriendName} onChange={e => setFakeFriendName(e.target.value)} placeholder="Friend's name..." className="w-full bg-[#0b141a] text-white border border-white/10 rounded-lg p-3 mb-3" />
          <input value={fakeMessageCount} onChange={e => setFakeMessageCount(Number(e.target.value))} type="number" min="1" max="10" placeholder="Message count (1-10)" className="w-full bg-[#0b141a] text-white border border-white/10 rounded-lg p-3 mb-3" />
          <div className="flex gap-2">
            <button onClick={handleFakeChat} className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors">
              <Sparkles size={16} className="inline mr-1" /> Generate
            </button>
            <button onClick={() => { setShowFakeModal(false); setFakeFriendName(''); }} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-80 p-2 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-400 text-xs font-bold px-3 py-2 uppercase tracking-wider">⚡ Quick Actions</h3>
        
        <button onClick={() => setShowExportSubmenu(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
          <Download size={18} className="text-blue-400" />
          <span className="text-sm">Export Chat</span>
        </button>

        <button onClick={() => setShowBulkModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
          <Send size={18} className="text-green-400" />
          <span className="text-sm">Mass Message</span>
        </button>

        <button onClick={() => setShowFakeModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
          <Sparkles size={18} className="text-purple-400" />
          <span className="text-sm">Fake Chat Generator</span>
        </button>

        <button onClick={() => setShowTextToolsSubmenu(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
          <Type size={18} className="text-cyan-400" />
          <span className="text-sm">Text Tools</span>
        </button>

        <button onClick={async () => { await downloadStatus(conversationId); onClose?.(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
          <Image size={18} className="text-pink-400" />
          <span className="text-sm">Download Status</span>
        </button>

        {peerUserId && (
          <button onClick={handleWatchOnline} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-colors">
            <Eye size={18} className="text-yellow-400" />
            <span className="text-sm">Notify When Online</span>
          </button>
        )}

        <div className="border-t border-white/10 my-1" />

        <button onClick={handleClearAll} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
          <Trash2 size={18} />
          <span className="text-sm">Clear All Chats</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActionsMenu;
