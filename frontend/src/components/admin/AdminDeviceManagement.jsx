import React, { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, Pager } from './adminUi';

const AdminDeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/devices', { params: { page, limit: 20 } });
      setDevices(data.devices || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Imeshindikana kupakua vifaa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const revoke = async (id) => {
    if (!window.confirm('Ondoa kifaa hiki? Mtumiaji ataondolewa mara moja.')) return;
    try {
      await adminApi.delete(`/admin/devices/${id}`);
      toast.success('Kifaa kimeondolewa');
      load(pagination.page);
    } catch {
      toast.error('Imeshindwa');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      <Table headers={['Jina la Kifaa', 'Aina', 'Iliyofanya Kazi Mwisho', 'Hali', 'Kitendo']}>
        {devices.map((d) => (
          <tr key={d._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{d.deviceName || d.deviceId}</td>
            <td className="p-3 text-gray-400">{d.deviceType || d.platform || '—'}</td>
            <td className="p-3 text-gray-400">{d.lastActive ? new Date(d.lastActive).toLocaleString() : '—'}</td>
            <td className="p-3">{d.isActive ? <span className="text-emerald-500">Amilifu</span> : <span className="text-gray-400">Haifanyi kazi</span>}</td>
            <td className="p-3"><button onClick={() => revoke(d._id)} className="text-red-500"><Trash2 size={16} /></button></td>
          </tr>
        ))}
        {devices.length === 0 && <EmptyRow colSpan={5} />}
      </Table>
      <Pager page={pagination.page} pages={pagination.pages} onChange={load} />
    </div>
  );
};

export default AdminDeviceManagement;
