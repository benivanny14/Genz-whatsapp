import React, { useState, useEffect, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { LoadingBlock } from './adminUi';

const AdminUserChat = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/direct-chats');
      setChats(data.chats || []);
    } catch {
      toast.error('Imeshindikana kupakua mazungumzo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    const targetUserId = active ? active.userId?._id || active.userId : newUserId;
    if (!targetUserId || !message.trim()) return;
    try {
      const { data } = await adminApi.post('/admin/direct-chats/start', { userId: targetUserId, message });
      toast.success('Ujumbe umetumwa');
      setActive(data.chat);
      setMessage('');
      setShowNew(false);
      load();
    } catch {
      toast.error('Imeshindwa kutuma');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-1 space-y-2">
        <button onClick={() => { setShowNew(true); setActive(null); }}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2 text-sm">
          <MessageCircle size={16} /> Anzisha Mazungumzo Mapya
        </button>
        {chats.map((c) => (
          <button key={c._id} onClick={() => { setActive(c); setShowNew(false); }}
            className={`w-full text-left p-3 rounded-lg border ${active?._id === c._id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
            <p className="text-sm font-medium">{c.userId?.username}</p>
            <p className="text-xs text-gray-400">{new Date(c.updatedAt).toLocaleString()}</p>
          </button>
        ))}
        {chats.length === 0 && <p className="text-gray-400 text-sm">Hakuna mazungumzo bado</p>}
      </div>

      <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        {showNew && (
          <input value={newUserId} onChange={(e) => setNewUserId(e.target.value)}
            placeholder="User ID ya mtumiaji (angalia kwenye User Management)"
            className="w-full mb-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
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
        {(active || showNew) && (
          <form onSubmit={send} className="flex gap-2">
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Andika ujumbe..."
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
            <button className="bg-emerald-600 text-white rounded-lg px-3 py-2"><Send size={16} /></button>
          </form>
        )}
        {!active && !showNew && <p className="text-gray-400 text-sm">Chagua mazungumzo au anzisha mapya</p>}
      </div>
    </div>
  );
};

export default AdminUserChat;
