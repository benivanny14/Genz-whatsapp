import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Trash2, Settings, RefreshCw, X, Shield, Bell, Plus, Send, User as UserIcon } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/fake-chat`;

const FakeChatPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [fakeChats, setFakeChats] = useState([]);
  const [fakeCalls, setFakeCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showCreateCall, setShowCreateCall] = useState(false);
  const [chatDraft, setChatDraft] = useState({ contactName: '', contactPhone: '', messages: '' });
  const [callDraft, setCallDraft] = useState({ contactName: '', contactPhone: '', callType: 'voice', duration: 60, isIncoming: true });

  useEffect(() => {
    Promise.allSettled([fetchSettings(), fetchFakeChats(), fetchFakeCalls()]).finally(() => setLoading(false));
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

  const fetchFakeCalls = async () => {
    try {
      const res = await authFetch(`${BASE}/calls`);
      const data = await res.json();
      if (data?.success) setFakeCalls(data.fakeCalls || []);
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

  const clearAllFakeData = async () => {
    try {
      await authFetch(`${BASE}/clear-all`, { method: 'DELETE' });
      setFakeChats([]);
      setFakeCalls([]);
    } catch (err) {
      setError('Failed to clear data');
    }
  };

  const deleteFakeChat = async (chatId) => {
    try {
      await authFetch(`${BASE}/chat/${chatId}`, { method: 'DELETE' });
      setFakeChats((prev) => prev.filter((chat) => chat._id !== chatId));
    } catch (err) {
      setError('Failed to delete fake chat');
    }
  };

  const deleteFakeCall = async (callId) => {
    try {
      await authFetch(`${BASE}/call/${callId}`, { method: 'DELETE' });
      setFakeCalls((prev) => prev.filter((call) => call._id !== callId));
    } catch (err) {
      setError('Failed to delete fake call');
    }
  };

  const createFakeChat = async () => {
    const name = chatDraft.contactName.trim();
    const messages = chatDraft.messages
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => ({ content: line, isFromMe: i % 2 === 0 }));
    if (!name || messages.length === 0) {
      setError('Enter a contact name and at least one message');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const res = await authFetch(`${BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: name,
          contactPhone: chatDraft.contactPhone.trim() || '+255700000000',
          messages
        })
      });
      const data = await res.json();
      if (data?.success) {
        setChatDraft({ contactName: '', contactPhone: '', messages: '' });
        setShowCreateChat(false);
        await fetchFakeChats();
      } else {
        setError(data?.message || 'Failed to create fake chat');
      }
    } catch (err) {
      setError('Failed to create fake chat');
    } finally {
      setSaving(false);
    }
  };

  const createFakeCall = async () => {
    const name = callDraft.contactName.trim();
    if (!name) {
      setError('Enter a contact name for the fake call');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const res = await authFetch(`${BASE}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: name,
          contactPhone: callDraft.contactPhone.trim() || '+255700000000',
          callType: callDraft.callType,
          duration: Number(callDraft.duration) || 0,
          isIncoming: callDraft.isIncoming
        })
      });
      const data = await res.json();
      if (data?.success) {
        setCallDraft({ contactName: '', contactPhone: '', callType: 'voice', duration: 60, isIncoming: true });
        setShowCreateCall(false);
        await fetchFakeCalls();
      } else {
        setError(data?.message || 'Failed to create fake call');
      }
    } catch (err) {
      setError('Failed to create fake call');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds) => {
    const s = Number(seconds) || 0;
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem ? `${m}m ${rem}s` : `${m}m`;
  };

  const inputClass = "w-full rounded-xl border border-white/15 bg-[#0b141a] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#00a884]";
  const labelClass = "block text-xs font-semibold uppercase tracking-wide text-blue-100/60 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Fake Chat & Calls</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              {/* Settings */}
              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Settings</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Enable Fake Chat</p>
                    <p className="text-gray-400 text-xs">Create fake conversations</p>
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

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Enable Fake Calls</p>
                    <p className="text-gray-400 text-xs">Create fake call logs</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.fakeCallsEnabled || false}
                      onChange={(e) => updateSettings({ ...settings, fakeCallsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Mark as Fake</p>
                    <p className="text-gray-400 text-xs">Label fake conversations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.markAsFake || false}
                      onChange={(e) => updateSettings({ ...settings, markAsFake: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Auto Delete Fake</p>
                    <p className="text-gray-400 text-xs">Automatically delete fake data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.autoDeleteFake || false}
                      onChange={(e) => updateSettings({ ...settings, autoDeleteFake: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Notify on Fake</p>
                    <p className="text-gray-400 text-xs">Get notifications for fake activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.notifyOnFake || false}
                      onChange={(e) => updateSettings({ ...settings, notifyOnFake: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>
              </div>

              {/* Create buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setShowCreateChat((v) => !v); setShowCreateCall(false); setError(''); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-sm font-medium"
                >
                  <Plus size={16} /> New Fake Chat
                </button>
                <button
                  onClick={() => { setShowCreateCall((v) => !v); setShowCreateChat(false); setError(''); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-sm font-medium"
                >
                  <Phone size={16} /> New Fake Call
                </button>
              </div>

              {/* Create Fake Chat form */}
              {showCreateChat && (
                <div className="bg-[#0b141a] rounded-xl border border-white/10 p-4 space-y-3">
                  <p className="text-white text-sm font-semibold">New Fake Chat</p>
                  <div>
                    <label className={labelClass}>Contact name</label>
                    <input
                      className={inputClass}
                      value={chatDraft.contactName}
                      onChange={(e) => setChatDraft((d) => ({ ...d, contactName: e.target.value }))}
                      placeholder="e.g. Mom"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact phone (optional)</label>
                    <input
                      className={inputClass}
                      value={chatDraft.contactPhone}
                      onChange={(e) => setChatDraft((d) => ({ ...d, contactPhone: e.target.value }))}
                      placeholder="+255700000000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Messages (one per line)</label>
                    <textarea
                      className={`${inputClass} h-28 resize-none`}
                      value={chatDraft.messages}
                      onChange={(e) => setChatDraft((d) => ({ ...d, messages: e.target.value }))}
                      placeholder={'Hi, are you there?\nYes, I am.\nCall me later.'}
                    />
                    <p className="mt-1 text-xs text-gray-400">Even-numbered lines appear as sent by you, odd lines as replies.</p>
                  </div>
                  <button
                    onClick={createFakeChat}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                  >
                    <Send size={16} /> {saving ? 'Creating...' : 'Create chat'}
                  </button>
                </div>
              )}

              {/* Create Fake Call form */}
              {showCreateCall && (
                <div className="bg-[#0b141a] rounded-xl border border-white/10 p-4 space-y-3">
                  <p className="text-white text-sm font-semibold">New Fake Call</p>
                  <div>
                    <label className={labelClass}>Contact name</label>
                    <input
                      className={inputClass}
                      value={callDraft.contactName}
                      onChange={(e) => setCallDraft((d) => ({ ...d, contactName: e.target.value }))}
                      placeholder="e.g. Dad"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact phone (optional)</label>
                    <input
                      className={inputClass}
                      value={callDraft.contactPhone}
                      onChange={(e) => setCallDraft((d) => ({ ...d, contactPhone: e.target.value }))}
                      placeholder="+255700000000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Call type</label>
                      <select
                        className={inputClass}
                        value={callDraft.callType}
                        onChange={(e) => setCallDraft((d) => ({ ...d, callType: e.target.value }))}
                      >
                        <option value="voice">Voice</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Duration (sec)</label>
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={callDraft.duration}
                        onChange={(e) => setCallDraft((d) => ({ ...d, duration: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">Direction</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCallDraft((d) => ({ ...d, isIncoming: true }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${callDraft.isIncoming ? 'bg-[#00a884] text-white' : 'bg-white/10 text-gray-400'}`}
                      >
                        Incoming
                      </button>
                      <button
                        onClick={() => setCallDraft((d) => ({ ...d, isIncoming: false }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!callDraft.isIncoming ? 'bg-[#00a884] text-white' : 'bg-white/10 text-gray-400'}`}
                      >
                        Outgoing
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={createFakeCall}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                  >
                    <Phone size={16} /> {saving ? 'Creating...' : 'Create call'}
                  </button>
                </div>
              )}

              {/* Fake Chats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Fake Chats ({fakeChats.length})</p>
                  <button
                    onClick={clearAllFakeData}
                    className="text-red-400 text-xs hover:text-red-300"
                  >
                    Clear All
                  </button>
                </div>
                {fakeChats.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No fake chats</p>
                ) : (
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
                )}
              </div>

              {/* Fake Calls */}
              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Fake Calls ({fakeCalls.length})</p>
                {fakeCalls.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No fake calls</p>
                ) : (
                  <div className="space-y-2">
                    {fakeCalls.map(call => (
                      <div key={call._id} className="bg-[#0b141a] rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Phone size={16} className={call.type === 'incoming' ? 'text-green-400' : 'text-blue-400'} />
                            <div className="min-w-0">
                              <p className="text-white text-sm truncate">{call.contactName}</p>
                              <p className="text-gray-400 text-xs">
                                {call.type === 'incoming' ? 'Incoming' : 'Outgoing'} • {formatDuration(call.duration)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFakeCall(call._id)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeChatPanel;
