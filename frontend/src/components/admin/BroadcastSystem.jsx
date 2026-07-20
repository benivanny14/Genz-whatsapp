import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow } from './adminUi';

const BroadcastSystem = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/broadcasts', { params: { limit: 30 } });
      setBroadcasts(data.broadcasts || []);
    } catch {
      toast.error('Imeshindikana kupakua broadcasts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try {
      await adminApi.delete(`/admin/broadcasts/${id}`);
      toast.success('Imefutwa');
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  const sendAnnouncement = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data } = await adminApi.post('/admin/broadcasts/announce', { content: message, segment });
      toast.success(data.message);
      setMessage('');
    } catch {
      toast.error('Imeshindwa kutuma');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3">Tuma Tangazo la Mfumo (System Announcement)</h3>
        <form onSubmit={sendAnnouncement} className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Andika ujumbe wa tangazo..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm"
          />
          <div className="flex gap-3 items-center">
            <select value={segment} onChange={(e) => setSegment(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
              <option value="all">Watumiaji wote</option>
              <option value="premium">Premium tu</option>
              <option value="free">Wasio Premium</option>
              <option value="blocked">Waliozuiwa</option>
            </select>
            <button disabled={sending} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-60">
              <Send size={14} /> {sending ? 'Inatuma...' : 'Tuma'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="font-medium mb-3">Broadcast Lists za Watumiaji</h3>
        {loading ? <LoadingBlock /> : (
          <Table headers={['Jina', 'Wapokeaji', 'Ilitengenezwa', 'Kitendo']}>
            {broadcasts.map((b) => (
              <tr key={b._id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-3">{b.name}</td>
                <td className="p-3">{(b.recipients || []).length}</td>
                <td className="p-3 text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="p-3"><button onClick={() => remove(b._id)} className="text-red-500"><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {broadcasts.length === 0 && <EmptyRow colSpan={4} />}
          </Table>
        )}
      </div>
    </div>
  );
};

export default BroadcastSystem;
