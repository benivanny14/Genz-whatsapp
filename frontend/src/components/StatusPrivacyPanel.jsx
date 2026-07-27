import React, { useEffect, useState } from 'react';
import { Eye, X, RefreshCw, UserPlus, UserMinus, Search } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import userService from '../services/userService';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api/status-features`;

const PRIVACY_OPTIONS = [
  ['everyone', 'Everyone', 'Anyone can see your status updates'],
  ['contacts', 'My contacts', 'Only people in your contacts'],
  ['nobody', 'Nobody', "Your status won't be shown to anyone"],
];

const StatusPrivacyPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sRes, contactList] = await Promise.all([
          authFetch(`${BASE}/settings`),
          userService.getContacts().catch(() => [])
        ]);
        const sData = await sRes.json();
        if (sData?.success) setSettings(sData.settings);
        else setError(sData?.message || 'Failed to load status settings');
        setContacts(Array.isArray(contactList) ? contactList : (contactList?.contacts || []));
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setPrivacy = async (privacy) => {
    setSettings((prev) => ({ ...prev, statusPrivacy: privacy }));
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/privacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy })
      });
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
      else setError(data?.message || 'Failed to save');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCloseFriend = async (userId, isMember) => {
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/close-friends/${isMember ? 'remove' : 'add'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data?.success) setSettings((prev) => ({ ...prev, closeFriends: data.closeFriends }));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const closeFriends = settings?.closeFriends || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Eye className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Status privacy</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading || !settings ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Who can see my status</p>
                {PRIVACY_OPTIONS.map(([value, label, desc]) => (
                  <button
                    key={value}
                    onClick={() => setPrivacy(value)}
                    disabled={saving}
                    className={`w-full text-left p-3 rounded-lg border ${settings.statusPrivacy === value ? 'border-[#00a884] bg-[#00a884]/10' : 'border-white/10 bg-[#0b141a]'}`}
                  >
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-gray-400 text-xs">{desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Close friends ({closeFriends.length})</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts"
                    className="w-full bg-[#0b141a] text-white pl-9 pr-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {filteredContacts.map((c) => {
                    const id = c._id || c.id;
                    const isMember = closeFriends.includes(id);
                    return (
                      <div key={id} className="flex items-center justify-between bg-[#0b141a] rounded-lg p-2 border border-white/10">
                        <span className="text-white text-sm truncate">{c.username || c.name}</span>
                        <button
                          onClick={() => toggleCloseFriend(id, isMember)}
                          disabled={saving}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${isMember ? 'bg-red-500/10 text-red-300' : 'bg-[#00a884]/20 text-[#00a884]'}`}
                        >
                          {isMember ? <><UserMinus size={12} /> Remove</> : <><UserPlus size={12} /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                  {filteredContacts.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">No contacts found</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusPrivacyPanel;
