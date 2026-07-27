import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, Pager } from './adminUi';

const ChatManagement = () => {
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [messages, setMessages] = useState([]);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/chats', { params: { page, limit: 20 } });
      setConversations(data.conversations || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Imeshindikana kupakua mazungumzo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const view = async (c) => {
    setViewing(c);
    try {
      const { data } = await adminApi.get(`/admin/chats/${c._id}/messages`);
      setMessages(data.messages || []);
    } catch {
      toast.error('Imeshindwa kupakua jumbe');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Una uhakika unataka kufuta mazungumzo haya?')) return;
    try {
      await adminApi.delete(`/admin/chats/${id}`);
      toast.success('Imefutwa');
      load(pagination.page);
      if (viewing?._id === id) setViewing(null);
    } catch {
      toast.error('Imeshindwa kufuta');
    }
  };

  if (viewing) {
    return (
      <div className="space-y-3">
        <button onClick={() => setViewing(null)} className="text-sm text-emerald-600">← Rudi kwenye orodha</button>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 max-h-[70vh] overflow-y-auto space-y-2">
          {messages.length === 0 && <p className="text-gray-400 text-sm">Hakuna jumbe</p>}
          {messages.slice().reverse().map((m) => (
            <div key={m._id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500 font-medium">{m.sender?.username || 'Mtumiaji'}:</span>{' '}
              <span className="text-gray-700 dark:text-gray-300">{m.content}</span>
              <div className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      <Table headers={['Aina', 'Washiriki', 'Jumbe', 'Ilisasishwa', 'Kitendo']}>
        {conversations.map((c) => (
          <tr key={c._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{c.isGroup ? 'Kikundi' : 'Binafsi'}</td>
            <td className="p-3">{(c.participants || []).map((p) => p.username).join(', ') || c.groupName}</td>
            <td className="p-3">{c.messageCount}</td>
            <td className="p-3 text-gray-400">{new Date(c.updatedAt).toLocaleDateString()}</td>
            <td className="p-3 flex gap-3">
              <button onClick={() => view(c)} className="text-blue-500"><Eye size={16} /></button>
              <button onClick={() => remove(c._id)} className="text-red-500"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
        {conversations.length === 0 && <EmptyRow colSpan={5} />}
      </Table>
      <Pager page={pagination.page} pages={pagination.pages} onChange={load} />
    </div>
  );
};

export default ChatManagement;
