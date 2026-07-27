import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, PhoneMissed, PhoneCall, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, StatCard } from './adminUi';

const CallsManagement = () => {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: listData }, { data: statsData }] = await Promise.all([
        adminApi.get('/admin/calls', { params: { limit: 30 } }),
        adminApi.get('/admin/calls/stats')
      ]);
      setCalls(listData.calls || []);
      setStats(statsData.stats);
    } catch {
      toast.error('Imeshindikana kupakua simu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try {
      await adminApi.delete(`/admin/calls/${id}`);
      toast.success('Imefutwa');
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Simu Zote" value={stats.totalCalls} />
          <StatCard label="Za Video" value={stats.byType?.video || 0} tone="blue" />
          <StatCard label="Za Sauti" value={stats.byType?.audio || stats.byType?.voice || 0} tone="violet" />
          <StatCard label="Zilizokosekana" value={stats.byStatus?.missed || 0} tone="red" />
          <StatCard label="Muda wa Wastani (sek)" value={stats.avgDurationSeconds} tone="amber" />
        </div>
      )}
      <Table headers={['Aina', 'Aliyepiga', 'Aliyepokea', 'Hali', 'Muda', 'Kitendo']}>
        {calls.map((c) => (
          <tr key={c._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{c.callType === 'video' ? <Video size={14} /> : <PhoneCall size={14} />}</td>
            <td className="p-3">{c.callerId?.username || '—'}</td>
            <td className="p-3">{c.calleeId?.username || '—'}</td>
            <td className="p-3">
              {c.status === 'missed'
                ? <span className="text-red-500 flex items-center gap-1"><PhoneMissed size={14} /> Haikupokewa</span>
                : c.status}
            </td>
            <td className="p-3">{c.duration ? `${c.duration}s` : '—'}</td>
            <td className="p-3"><button onClick={() => remove(c._id)} className="text-red-500"><Trash2 size={16} /></button></td>
          </tr>
        ))}
        {calls.length === 0 && <EmptyRow colSpan={6} />}
      </Table>
    </div>
  );
};

export default CallsManagement;
