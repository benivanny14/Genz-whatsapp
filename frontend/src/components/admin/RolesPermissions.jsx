import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { LoadingBlock, Table, EmptyRow } from './adminUi';

const RolesPermissions = () => {
  const [options, setOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: opts }, { data: usersData }] = await Promise.all([
        adminApi.get('/admin/permissions/options'),
        adminApi.get('/admin/permissions/users')
      ]);
      setOptions(opts.permissions || []);
      setUsers(usersData.users || []);
    } catch {
      toast.error('Imeshindikana kupakua ruhusa');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const searchUser = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await adminApi.get('/admin/users', { params: { search, limit: 5 } });
      setFoundUser(data.users?.[0] || null);
      if (!data.users?.length) toast.error('Mtumiaji hajapatikana');
    } catch {
      toast.error('Imeshindwa kutafuta');
    }
  };

  const togglePermission = async (userId, current, key) => {
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    try {
      await adminApi.patch(`/admin/permissions/users/${userId}`, { permissions: next });
      toast.success('Imesasishwa');
      if (foundUser?._id === userId) setFoundUser({ ...foundUser, appPermissions: next });
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
        Kumbuka: ruhusa hizi ni za ndani ya app tu (mfano: kusimamia maudhui ya kikundi). Hazimpi
        mtumiaji njia ya kufikia dashibodi hii ya admin — hiyo ni WEWE peke yako.
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tafuta mtumiaji wa kumpa ruhusa..."
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm" />
        <button onClick={searchUser} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Tafuta</button>
      </div>

      {foundUser && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="font-medium mb-2">{foundUser.username}</p>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const has = (foundUser.appPermissions || []).includes(o.key);
              return (
                <button key={o.key} onClick={() => togglePermission(foundUser._id, foundUser.appPermissions || [], o.key)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${has ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-2 text-sm">Watumiaji Wenye Ruhusa Maalum</h3>
        <Table headers={['Mtumiaji', 'Simu', 'Ruhusa']}>
          {users.map((u) => (
            <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{u.username}</td>
              <td className="p-3 text-gray-400">{u.phoneNumber}</td>
              <td className="p-3 text-xs text-gray-500">{(u.appPermissions || []).join(', ')}</td>
            </tr>
          ))}
          {users.length === 0 && <EmptyRow colSpan={3} text="Hakuna mtumiaji mwenye ruhusa maalum bado" />}
        </Table>
      </div>
    </div>
  );
};

export default RolesPermissions;
