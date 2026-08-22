import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { StatCard, LoadingBlock } from './adminUi';
import { useConfirm } from '../ConfirmDialog';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return '—'; }
};

const BackupManagement = () => {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ groups: [], total: 0, totalSizeHuman: '0 B', usersWithBackups: 0, storage: 'local' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await adminApi.get('/admin/backups');
      setData(res || { groups: [], total: 0, totalSizeHuman: '0 B', usersWithBackups: 0, storage: 'local' });
    } catch {
      toast.error('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (backupId, username) => {
    if (!(await confirm(`Delete this backup for "${username}"?\n${backupId}\n\nThis cannot be undone.`))) return;
    try {
      await adminApi.delete(`/admin/backups/${backupId}`);
      toast.success('Backup deleted');
      load();
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Backups" value={data.total} />
        <StatCard label="Total Size" value={data.totalSizeHuman} />
        <StatCard label="Users with Backups" value={data.usersWithBackups} />
        <StatCard label="Storage" value={data.storage === 's3' ? 'S3 Cloud' : 'Local Disk'} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">User Backups</h3>
        <button onClick={load} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {data.groups.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-gray-400">
          No user backups yet. Users create backups from Settings → Backup & Restore.
        </div>
      ) : (
        <div className="space-y-4">
          {data.groups.map((g) => (
            <div key={g.userId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-medium text-sm">{g.username}</p>
                  <p className="text-xs text-gray-400">{g.phoneNumber} · {g.backupCount} backup(s) · {g.totalSizeHuman}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="text-left p-3 whitespace-nowrap">Backup File</th>
                      <th className="text-left p-3 whitespace-nowrap">Size</th>
                      <th className="text-left p-3 whitespace-nowrap">Created</th>
                      <th className="text-left p-3 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.backups.map((b) => (
                      <tr key={b.backupId} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-mono text-xs text-gray-600 dark:text-gray-300 break-all">{b.backupId}</td>
                        <td className="p-3 whitespace-nowrap">{b.sizeHuman}</td>
                        <td className="p-3 whitespace-nowrap text-gray-400">{fmtDate(b.lastModified)}</td>
                        <td className="p-3">
                          <button
                            onClick={() => remove(b.backupId, g.username)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Delete backup"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackupManagement;
