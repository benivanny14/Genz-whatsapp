import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Users, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { Table, LoadingBlock, EmptyRow, Pager } from './adminUi';
import { useConfirm } from '../ConfirmDialog';

const GroupManagement = () => {
  const confirm = useConfirm();
  const [groups, setGroups] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/groups', { params: { page, limit: 20, search: q } });
      setGroups(data.groups || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  const viewMembers = async (g) => {
    try {
      const { data } = await adminApi.get(`/admin/groups/${g._id}`);
      setViewing(data.group);
    } catch {
      toast.error('Failed to load members');
    }
  };

  const removeMember = async (userId) => {
    if (!viewing) return;
    try {
      await adminApi.post(`/admin/groups/${viewing._id}/members/${userId}/remove`);
      toast.success('Ameondolewa');
      viewMembers(viewing);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const removeGroup = async (id) => {
    if (!(await confirm('Delete this group permanently?'))) return;
    try {
      await adminApi.delete(`/admin/groups/${id}`);
      toast.success('Group deleted');
      setViewing(null);
      load(pagination.page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (viewing) {
    return (
      <div className="space-y-3">
        <button onClick={() => setViewing(null)} className="text-sm text-emerald-600">← Back to list</button>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <h3 className="font-medium mb-3">{viewing.groupName}</h3>
          <div className="space-y-2">
            {(viewing.participants || []).map((p) => (
              <div key={p._id} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                <span>{p.username} {p.isBlocked && <span className="text-red-500 text-xs">(blocked)</span>}</span>
                <button onClick={() => removeMember(p._id)} className="text-red-500 text-xs flex items-center gap-1">
                  <UserMinus size={14} /> Remove
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => removeGroup(viewing._id)} className="mt-4 text-sm text-red-600 flex items-center gap-1">
            <Trash2 size={14} /> Delete group permanently
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); load(1, search); }} className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search group name..."
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Search</button>
      </form>
      <Table headers={['Name', 'Members', 'Updated', 'Action']}>
        {groups.map((g) => (
          <tr key={g._id} className="border-t border-gray-100 dark:border-gray-800">
            <td className="p-3">{g.groupName || '—'}</td>
            <td className="p-3">{g.memberCount}</td>
            <td className="p-3 text-gray-400">{new Date(g.updatedAt).toLocaleDateString()}</td>
            <td className="p-3 flex gap-3">
              <button onClick={() => viewMembers(g)} className="text-blue-500"><Users size={16} /></button>
              <button onClick={() => removeGroup(g._id)} className="text-red-500"><Trash2 size={16} /></button>
            </td>
          </tr>
        ))}
        {groups.length === 0 && <EmptyRow colSpan={4} />}
      </Table>
      <Pager page={pagination.page} pages={pagination.pages} onChange={(p) => load(p, search)} />
    </div>
  );
};

export default GroupManagement;
