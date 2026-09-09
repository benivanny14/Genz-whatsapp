import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../services/adminApi';
import toast from 'react-hot-toast';

export default function WingaManagement() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/winga', { params: { search } });
      setListings(data.listings || []);
    } catch { toast.error('Failed to load winga listings'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await adminApi.delete(`/admin/winga/${id}`);
      toast.success('Listing deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title..." className="flex-1 bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Search</button>
      </div>
      {loading ? <p className="text-sm text-gray-400">Loading...</p> : listings.length === 0 ? <p className="text-sm text-gray-400">No listings found.</p> : (
        <div className="grid gap-3">
          {listings.map((l) => (
            <div key={l._id} className="bg-white dark:bg-gray-900 border rounded-xl p-3 flex gap-3">
              <img src={l.media?.[0]?.url || '/icons/icon-192x192.png'} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{l.title}</p>
                <p className="text-xs text-gray-500 truncate">{l.description}</p>
                <p className="text-xs text-gray-400">Seller: {l.userId?.username || 'Unknown'} • {l.category} • TZS {l.price}</p>
              </div>
              <button onClick={() => handleDelete(l._id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg h-fit">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
