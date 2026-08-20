import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, RefreshCw, X, Plus, Send, User as UserIcon, Sparkles, MessageCircle, Check, Clock } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/fake-chat`;

const FakeChatPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [fakeChats, setFakeChats] = useState([]);
  const [premadeConversations, setPremadeConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.allSettled([fetchSettings(), fetchFakeChats(), fetchPremadeConversations()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authFetch(`${BASE}/settings`);
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
    } catch (err) {
      setError('Failed to load settings');
    }
  };

  const fetchFakeChats = async () => {
    try {
      const res = await authFetch(`${BASE}/chats`);
      const data = await res.json();
      if (data?.success) setFakeChats(data.fakeChats || []);
    } catch (err) {}
  };

  const fetchPremadeConversations = async () => {
    try {
      const res = await authFetch(`${BASE}/premade`);
      const data = await res.json();
      if (data?.success) setPremadeConversations(data.conversations || []);
    } catch (err) {}
  };

  const updateSettings = async (newSettings) => {
    try {
      setSaving(true);
      setError('');
      const res = await authFetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const createFromTemplate = async (templateId) => {
    if (!settings?.fakeChatEnabled) {
      setError('Please enable Fake Chat first');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const res = await authFetch(`${BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });
      const data = await res.json();
      if (data?.success) {
        setSuccess('Fake chat created! Check your chat list.');
        await fetchFakeChats();
      } else {
        setError(data?.message || 'Failed to create chat');
      }
    } catch (err) {
      setError('Failed to create chat');
    } finally {
      setSaving(false);
    }
  };

  const deleteFakeChat = async (chatId) => {
    try {
      await authFetch(`${BASE}/chat/${chatId}`, { method: 'DELETE' });
      setFakeChats((prev) => prev.filter((chat) => chat._id !== chatId));
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const clearAllFakeData = async () => {
    try {
      await authFetch(`${BASE}/clear-all`, { method: 'DELETE' });
      setFakeChats([]);
    } catch (err) {
      setError('Failed to clear');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Fake Chat</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error/Success messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
                <X size={16} />
              </button>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-sm rounded-lg p-3 flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
                <X size={16} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin text-[#00a884]" size={24} />
            </div>
          ) : (
            <>
              {/* Enable/Disable Toggle */}
              <div className="bg-[#0b141a] rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Enable Fake Chat</p>
                    <p className="text-gray-400 text-xs">Turn on to create fake conversations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.fakeChatEnabled || false}
                      onChange={(e) => updateSettings({ ...settings, fakeChatEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>
              </div>

              {/* Pre-made Conversations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#00a884]" />
                  <p className="text-white text-sm font-semibold">Ready-Made Conversations</p>
                </div>
                
                <p className="text-gray-400 text-xs">
                  Select a conversation below to instantly create a fake chat with realistic messages between two people.
                </p>
                
                {!settings?.fakeChatEnabled && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs rounded-lg p-3">
                    Enable Fake Chat above first, then click any conversation to create it.
                  </div>
                )}
                
                {premadeConversations.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No conversations available</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {premadeConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => createFromTemplate(conv.id)}
                        disabled={saving || !settings?.fakeChatEnabled}
                        className="bg-[#0b141a] rounded-lg p-3 border border-white/10 hover:border-[#00a884]/50 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                              <MessageCircle size={18} className="text-[#00a884]" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{conv.contactName}</p>
                              <p className="text-gray-400 text-xs">{conv.category} • {conv.messageCount} messages</p>
                            </div>
                          </div>
                          <div className="text-[#00a884]">
                            {saving ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <Plus size={18} />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Existing Fake Chats */}
              {fakeChats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Created Chats ({fakeChats.length})</p>
                    </div>
                    <button
                      onClick={clearAllFakeData}
                      className="text-red-400 text-xs hover:text-red-300"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {fakeChats.map(chat => (
                      <div key={chat._id} className="bg-[#0b141a] rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserIcon size={16} className="text-[#00a884] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">{chat.contactName}</p>
                              <p className="text-gray-400 text-xs truncate">{chat.lastMessageText || 'No messages yet'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFakeChat(chat._id)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeChatPanel;
