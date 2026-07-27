import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, StatCard } from './adminUi';

const StatusStoriesManagement = ({ mode = 'status' }) => {
  const [statuses, setStatuses] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'status') {
        const { data } = await adminApi.get('/admin/statuses', { params: { limit: 30, active: true } });
        setStatuses(data.statuses || []);
      } else {
        const { data } = await adminApi.get('/admin/statuses/highlights');
        setHighlights(data.highlights || []);
      }
    } catch {
      toast.error('Imeshindikana kupakua data');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!window.confirm('Futa status hii?')) return;
    try {
      await adminApi.delete(`/admin/statuses/${id}`);
      toast.success('Imefutwa');
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  if (loading) return <LoadingBlock />;

  if (mode === 'stories') {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 text-sm">
          "Stories" ni mkusanyiko wa Status za mtumiaji kwa muda husika — hapa chini ni watumiaji
          walio na machapisho mengi zaidi ya status hivi karibuni.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.slice(0, 4).map((h) => (
            <StatCard key={h._id} label={h.user?.username || 'Mtumiaji'} value={h.count} sub={`views ${h.totalViews}`} />
          ))}
        </div>
        <Table headers={['Mtumiaji', 'Simu', 'Idadi ya Status', 'Views Zote', 'Ilipoandikwa Mwisho']}>
          {highlights.map((h) => (
            <tr key={h._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{h.user?.username || '—'}</td>
              <td className="p-3 text-gray-400">{h.user?.phoneNumber}</td>
              <td className="p-3">{h.count}</td>
              <td className="p-3">{h.totalViews}</td>
              <td className="p-3 text-gray-400">{new Date(h.lastPostedAt).toLocaleString()}</td>
            </tr>
          ))}
          {highlights.length === 0 && <EmptyRow colSpan={5} />}
        </Table>
      </div>
    );
  }

  return (
    <Table headers={['Mtumiaji', 'Aina', 'Views', 'Inaisha', 'Kitendo']}>
      {statuses.map((s) => (
        <tr key={s._id} className="border-t border-gray-100 dark:border-gray-800">
          <td className="p-3">{s.user?.username || '—'}</td>
          <td className="p-3 text-gray-400">{s.type || s.mediaType || 'text'}</td>
          <td className="p-3">{s.viewsCount || (s.views || []).length}</td>
          <td className="p-3 text-gray-400">{new Date(s.expiresAt).toLocaleString()}</td>
          <td className="p-3">
            <button onClick={() => remove(s._id)} className="text-red-500"><Trash2 size={16} /></button>
          </td>
        </tr>
      ))}
      {statuses.length === 0 && <EmptyRow colSpan={5} />}
    </Table>
  );
};

export default StatusStoriesManagement;
