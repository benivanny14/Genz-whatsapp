import { useState } from 'react';
import { Plus, X, MessageSquare, Save, Trash2, Bot } from 'lucide-react';

const AutoReplySettings = ({ onClose, onSave }) => {
  const [autoReplies, setAutoReplies] = useState([
    { id: 1, keyword: 'hello', reply: 'Hi there! How can I help you?', enabled: true },
    { id: 2, keyword: 'price', reply: 'Our prices start from $10. Please check our catalogue!', enabled: true }
  ]);
  const [awayMessage, setAwayMessage] = useState('I am currently away. I will reply as soon as possible.');
  const [awayEnabled, setAwayEnabled] = useState(false);

  const addAutoReply = () => {
    const newReply = {
      id: Date.now(),
      keyword: '',
      reply: '',
      enabled: true
    };
    setAutoReplies([...autoReplies, newReply]);
  };

  const updateAutoReply = (id, field, value) => {
    setAutoReplies(autoReplies.map(reply => 
      reply.id === id ? { ...reply, [field]: value } : reply
    ));
  };

  const deleteAutoReply = (id) => {
    setAutoReplies(autoReplies.filter(reply => reply.id !== id));
  };

  const handleSave = () => {
    const settings = {
      autoReplies: autoReplies.filter(r => r.enabled),
      awayMessage,
      awayEnabled
    };
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Bot size={24} />
            Auto Reply Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-full"
           aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Away Message */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <MessageSquare size={18} />
                Away Message
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={awayEnabled}
                  onChange={(e) => setAwayEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-400 text-sm">Enabled</span>
              </label>
            </div>
            <textarea
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              placeholder="Enter your away message..."
              rows={3}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Auto Replies */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">Keyword Auto Replies</h3>
              <button
                onClick={addAutoReply}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Add Rule
              </button>
            </div>
            <div className="space-y-3">
              {autoReplies.map((reply) => (
                <div key={reply.id} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Keyword</label>
                        <input
                          type="text"
                          value={reply.keyword}
                          onChange={(e) => updateAutoReply(reply.id, 'keyword', e.target.value)}
                          placeholder="e.g., hello"
                          className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs block mb-1">Reply</label>
                        <input
                          type="text"
                          value={reply.reply}
                          onChange={(e) => updateAutoReply(reply.id, 'reply', e.target.value)}
                          placeholder="Auto reply message"
                          className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reply.enabled}
                          onChange={(e) => updateAutoReply(reply.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                      </label>
                      <button
                        onClick={() => deleteAutoReply(reply.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
                       aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {autoReplies.length === 0 && (
                <div className="text-center text-gray-400 py-6">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No auto reply rules yet</p>
                  <p className="text-xs">Add rules to automatically reply to messages</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoReplySettings;
