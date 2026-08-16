import React, { useState } from 'react';
import { LogOut, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, EmptyRow } from './adminUi';

const SessionManagement = () => {
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);

  const findUser = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await adminApi.get('/admin/users', { params: { search, limit: 5 } });
      const found = data.users?.[0];
      if (!found) { toast.error('User not found'); return; }
      setUser(found);
      const { data: sData } = await adminApi.get(`/admin/sessions/${found._id}`);
      setSessions(sData.sessions || []);
    } catch {
      toast.error('Failed to search');
    }
  };

  const revoke = async (token) => {
    try {
      await adminApi.delete(`/admin/sessions/${user._id}/${token}`);
      toast.success('Session removed');
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch {
      toast.error('Failed to remove session');
    }
  };

  const revokeAll = async () => {
    if (!window.confirm('Remove all sessions for this user? They will be logged out of all devices.')) return;
    try {
      await adminApi.delete(`/admin/sessions/${user._id}/all`);
      toast.success('All sessions removed');
      setSessions([]);
    } catch {
      toast.error('Failed to remove all sessions');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a user..."
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <button onClick={findUser} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Search</button>
      </div>

      {user && (
        <>
          <div className="flex justify-between items-center">
            <p className="font-medium">{user.username} — Active Session</p>
            {sessions.length > 0 && (
              <button onClick={revokeAll} className="text-xs text-red-600 flex items-center gap-1">
                <ShieldOff size={14} /> Remove All
              </button>
            )}
          </div>
          <Table headers={['Device', 'IP', 'Started', 'Last Active', 'Action']}>
            {sessions.map((s) => (
              <tr key={s.token} className="border-t border-gray-100 dark:border-gray-800">
                <td className="p-3">{s.device || '—'}</td>
                <td className="p-3 font-mono text-xs">{s.ip || '—'}</td>
                <td className="p-3 text-gray-400">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-3 text-gray-400">{new Date(s.lastActiveAt).toLocaleString()}</td>
                <td className="p-3"><button onClick={() => revoke(s.token)} className="text-red-500"><LogOut size={16} /></button></td>
              </tr>
            ))}
            {sessions.length === 0 && <EmptyRow colSpan={5} text="Hana session amilifu" />}
          </Table>
        </>
      )}
    </div>
  );
};

export default SessionManagement;
