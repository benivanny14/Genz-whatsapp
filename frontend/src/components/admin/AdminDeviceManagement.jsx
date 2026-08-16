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
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const revoke = async (id) => {
    if (!window.confirm('Remove this device? The user will be logged out immediately.')) return;
    try {
      await adminApi.delete(`/admin/devices/${id}`);
      toast.success('Device removed');
      load(pagination.page);
    } catch {
      toast.error('Failed to remove device');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      <Table headers={['Device Name', 'Type', 'Last Active', 'Status', 'Action']}>
        {devices.map((d) => (
          <tr key={d._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{d.deviceName || d.deviceId}</td>
            <td className="p-3 text-gray-400">{d.deviceType || d.platform || '—'}</td>
            <td className="p-3 text-gray-400">{d.lastActive ? new Date(d.lastActive).toLocaleString() : '—'}</td>
            <td className="p-3">{d.isActive ? <span className="text-emerald-500">Active</span> : <span className="text-gray-400">Inactive</span>}</td>
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
