import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Radio, Send, Users } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const Broadcast = () => {
  const navigate = useNavigate();
  const { broadcasts, conversations, sendMassMessage } = useChat();
  const [showNewBroadcast, setShowNewBroadcast] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [message, setMessage] = useState('');

  const handleCreateBroadcast = () => {
    if (selectedRecipients.length > 0 && message.trim()) {
      sendMassMessage(selectedRecipients, message, 'currentUser');
      setShowNewBroadcast(false);
      setSelectedRecipients([]);
      setMessage('');
    }
  };

  const toggleRecipient = (convId) => {
    setSelectedRecipients(prev => 
      prev.includes(convId) 
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    );
  };

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden font-sans">
      <div className="w-full h-full md:w-[98%] md:h-[96%] bg-gradient-to-br from-gray-900 via-black to-gray-900 backdrop-blur-xl shadow-2xl flex flex-col border border-white/10">
        {/* Header */}
        <div className="bg-black/60 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Broadcast Lists</h1>
          <button
            onClick={() => setShowNewBroadcast(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
           aria-label="Add">
            <Plus size={24} />
          </button>
        </div>

        {/* Broadcast List */}
        <div className="flex-1 overflow-y-auto p-4">
          {broadcasts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Radio size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No broadcast lists yet</p>
              <p className="text-sm">Create a broadcast to send messages to multiple contacts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(broadcasts || []).map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-lg shadow hover:bg-white/10 transition-shadow cursor-pointer border border-white/10"
                >
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white border border-white/20">
                    <Radio size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{broadcast.sender || 'Broadcast'}</p>
                    <p className="text-sm text-gray-400">{broadcast.recipients?.length || 0} recipients</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(broadcast.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Broadcast Modal */}
        {showNewBroadcast && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg w-[500px] max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">New Broadcast</h3>
                <button onClick={() => setShowNewBroadcast(false)} className="text-gray-400 hover:text-white" aria-label="Close">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-400 mb-4">Select recipients:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {(conversations || []).map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => toggleRecipient(conv._id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedRecipients.includes(conv._id) 
                          ? 'bg-white/10 border-white/20' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold border border-white/20">
                        {conv.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{conv.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{conv.isGroup ? 'Group' : 'Chat'}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-primary-600 flex items-center justify-center">
                        {selectedRecipients.includes(conv._id) && (
                          <div className="w-3 h-3 bg-primary-600 rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your broadcast message..."
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg resize-none h-24 focus:outline-none focus:border-white/30 text-white placeholder-gray-500 backdrop-blur-sm"
                />
              </div>

              <div className="p-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  <Users size={16} className="inline mr-1" />
                  {selectedRecipients.length} recipients selected
                </span>
                <button
                  onClick={handleCreateBroadcast}
                  disabled={selectedRecipients.length === 0 || !message.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={18} />
                  Send Broadcast
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Broadcast;
