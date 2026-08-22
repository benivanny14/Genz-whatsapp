import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, StatCard } from './adminUi';
import { useConfirm } from '../ConfirmDialog';

const StatusStoriesManagement = ({ mode = 'status' }) => {
  const confirm = useConfirm();
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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    if (!(await confirm('Delete this status?'))) return;
    try {
      await adminApi.delete(`/admin/statuses/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete status');
    }
  };

  if (loading) return <LoadingBlock />;

  if (mode === 'stories') {
    return (
      <div className="space-y-4">
        <p className="text-gray-500 text-sm">
          "Stories" is a collection of a user's Statuses for a given period — below are the users
          with the most status posts recently.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.slice(0, 4).map((h) => (
            <StatCard key={h._id} label={h.user?.username || 'User'} value={h.count} sub={`views ${h.totalViews}`} />
          ))}
        </div>
        <Table headers={['User', 'Phone', 'Status Count', 'Total Views', 'Last Posted']}>
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
    <Table headers={['User', 'Type', 'Views', 'Expires', 'Action']}>
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
