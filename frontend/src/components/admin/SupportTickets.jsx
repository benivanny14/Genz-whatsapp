import React, { useState, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow } from './adminUi';

const STATUS_COLORS = {
  open: 'text-amber-500', pending: 'text-blue-500', resolved: 'text-emerald-500', closed: 'text-gray-400'
};

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/tickets', { params: { limit: 30 } });
      setTickets(data.tickets || []);
    } catch {
      toast.error('Imeshindikana kupakua tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (t) => {
    try {
      const { data } = await adminApi.get(`/admin/tickets/${t._id}`);
      setActive(data.ticket);
    } catch {
      toast.error('Imeshindwa kufungua ticket');
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !active) return;
    try {
      const { data } = await adminApi.post(`/admin/tickets/${active._id}/reply`, { message: reply });
      setActive(data.ticket);
      setReply('');
      load();
    } catch {
      toast.error('Imeshindwa kutuma jibu');
    }
  };

  const changeStatus = async (status) => {
    if (!active) return;
    try {
      const { data } = await adminApi.patch(`/admin/tickets/${active._id}/status`, { status });
      setActive(data.ticket);
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  if (active) {
    return (
      <div className="space-y-3">
        <button onClick={() => setActive(null)} className="text-sm text-emerald-600">← Rudi kwenye orodha</button>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-medium">{active.subject}</h3>
              <p className="text-xs text-gray-400">{active.userId?.username} • {active.category}</p>
            </div>
            <select value={active.status} onChange={(e) => changeStatus(e.target.value)}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-3">
            {active.conversation.map((m, i) => (
              <div key={i} className={`text-sm rounded-lg p-2 max-w-[80%] ${m.sender === 'admin' ? 'bg-emerald-600 text-white ml-auto' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {m.message}
                <div className="text-[10px] opacity-70 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendReply} className="flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Andika jibu..."
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
            <button className="bg-emerald-600 text-white rounded-lg px-3 py-2"><Send size={16} /></button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <Table headers={['Mada', 'Mtumiaji', 'Aina', 'Hali', 'Ilisasishwa']}>
      {tickets.map((t) => (
        <tr key={t._id} onClick={() => openTicket(t)} className="border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          <td className="p-3">{t.subject}</td>
          <td className="p-3">{t.userId?.username}</td>
          <td className="p-3 text-gray-400">{t.category}</td>
          <td className={`p-3 font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</td>
          <td className="p-3 text-gray-400">{new Date(t.updatedAt).toLocaleString()}</td>
        </tr>
      ))}
      {tickets.length === 0 && <EmptyRow colSpan={5} />}
    </Table>
  );
};

export default SupportTickets;
