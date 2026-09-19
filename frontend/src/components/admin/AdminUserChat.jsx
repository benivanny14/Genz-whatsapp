import React, { useState, useEffect, useCallback } from 'react';
import { Send, MessageCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { getAdminSocket } from '../../services/adminSocket';
import { LoadingBlock } from './adminUi';

const AdminUserChat = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/direct-chats');
      setChats(data.chats || []);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;
    const onReply = () => load();
    socket.on('ticket:reply', onReply);
    socket.on('payment:message', onReply);
    return () => {
      socket.off('ticket:reply', onReply);
      socket.off('payment:message', onReply);
    };
  }, [load]);

  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await adminApi.get(`/admin/users?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(data.users || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { searchUsers(userSearch); }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const send = async (e) => {
    e.preventDefault();
    const targetUserId = active ? active.userId?._id || active.userId : newUserId;
    if (!targetUserId || !message.trim()) return;
    try {
      const { data } = await adminApi.post('/admin/direct-chats/start', { userId: targetUserId, message });
      toast.success('Message sent');
      setActive(data.chat);
      setMessage('');
      setShowNew(false);
      setNewUserId('');
      setUserSearch('');
      setSearchResults([]);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send';
      toast.error(msg);
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-2">
        <button onClick={() => { setShowNew(true); setActive(null); setUserSearch(''); setNewUserId(''); }}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 text-sm">
          <MessageCircle size={16} /> Start New Conversation
        </button>
        {chats.map((c) => (
          <button key={c._id} onClick={() => { setActive(c); setShowNew(false); }}
            className={`w-full text-left p-3 rounded-lg border ${active?._id === c._id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
            <p className="text-sm font-medium">{c.userId?.username || 'Unknown'}</p>
            <p className="text-xs text-gray-400">{new Date(c.updatedAt).toLocaleString()}</p>
          </button>
        ))}
        {chats.length === 0 && <p className="text-gray-400 text-sm">No conversations yet</p>}
      </div>

      <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        {showNew && !newUserId && (
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm"
                autoFocus
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => { setNewUserId(u._id); setUserSearch(u.username || u.phoneNumber); setSearchResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <span className="font-medium">{u.username || 'No name'}</span>
                    <span className="text-gray-400 ml-2">{u.phoneNumber}</span>
                  </button>
                ))}
              </div>
            )}
            {userSearch.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="text-xs text-gray-400 mt-2">No users found</p>
            )}
          </div>
        )}
        {showNew && newUserId && (
          <p className="text-xs text-emerald-400 mb-2">To: {userSearch}</p>
        )}
        {active && (
          <div className="space-y-2 max-h-96 overflow-y-auto mb-3">
            {active.conversation?.map((m, i) => (
              <div key={i} className={`text-sm rounded-lg p-2 max-w-[80%] ${m.sender === 'admin' ? 'bg-emerald-600 text-white ml-auto' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {m.message}
              </div>
            ))}
          </div>
        )}
        {(active || (showNew && newUserId)) && (
          <form onSubmit={send} className="flex gap-2">
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..."
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
            <button className="bg-emerald-600 text-white rounded-lg px-3 py-2"><Send size={16} /></button>
          </form>
        )}
        {!active && !showNew && <p className="text-gray-400 text-sm">Choose a conversation or start a new one</p>}
      </div>
    </div>
  );
};

export default AdminUserChat;
