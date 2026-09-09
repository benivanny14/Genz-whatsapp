import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function CommunityManagement() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/communities', { params: { search } });
      setCommunities(data.communities || []);
    } catch { toast.error('Failed to load communities'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this community?')) return;
    try {
      await adminApi.delete(`/admin/communities/${id}`);
      toast.success('Community deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search community..." className="flex-1 bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Search</button>
      </div>
      {loading ? <p className="text-sm text-gray-400">Loading...</p> : communities.length === 0 ? <p className="text-sm text-gray-400">No communities found.</p> : (
        <div className="grid gap-3">
          {communities.map((c) => (
            <div key={c._id} className="bg-white dark:bg-gray-900 border rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-gray-500">{c.description?.slice(0, 80)}</p>
                <p className="text-xs text-gray-400">Owner: {c.owner?.username || 'Unknown'} • Members: {c.members?.length || 0}</p>
              </div>
              <button onClick={() => handleDelete(c._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
