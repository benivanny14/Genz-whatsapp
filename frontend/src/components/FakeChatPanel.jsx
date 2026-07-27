import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Trash2, Settings, RefreshCw, X, Shield, Bell } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/fake-chat`;

const FakeChatPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [fakeChats, setFakeChats] = useState([]);
  const [fakeCalls, setFakeCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchFakeChats();
    fetchFakeCalls();
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
      if (data?.success) setFakeChats(data.chats || []);
    } catch (err) {}
  };

  const fetchFakeCalls = async () => {
    try {
      const res = await authFetch(`${BASE}/calls`);
      const data = await res.json();
      if (data?.success) setFakeCalls(data.calls || []);
    } catch (err) {}
  };

  const updateSettings = async (newSettings) => {
    try {
      setSaving(true);
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
                          <div>
                            <p className="text-white text-sm">{chat.contactName}</p>
                            <p className="text-gray-400 text-xs">{chat.lastMessage}</p>
                          </div>
                          <button
                            onClick={() => {/* Delete chat */}}
                            className="text-red-400 hover:text-red-300"
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
                          <div className="flex items-center gap-2">
                            <Phone size={16} className={call.type === 'incoming' ? 'text-green-400' : 'text-blue-400'} />
                            <div>
                              <p className="text-white text-sm">{call.contactName}</p>
                              <p className="text-gray-400 text-xs">{call.duration}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {/* Delete call */}}
                            className="text-red-400 hover:text-red-300"
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
