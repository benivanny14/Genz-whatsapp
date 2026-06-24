import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Users, Bell, BellOff, Share2, Hash, Megaphone, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

const Channels = ({ onBack }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('discover'); // discover | following
  const [channels, setChannels] = useState([]);
  const [following, setFollowing] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', category: 'General' });
  const [creating, setCreating] = useState(false);

  const CATEGORIES = ['General', 'News', 'Sports', 'Entertainment', 'Technology', 'Business', 'Health', 'Education', 'Other'];

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const [discRes, folRes] = await Promise.all([
        api.get('/channels?limit=50'),
        api.get('/channels/following'),
      ]);
      setChannels(discRes.data?.channels || []);
      setFollowing(folRes.data?.channels || []);
    } catch (e) {
      // Channels API may not be setup yet - show empty state
      setChannels([]); setFollowing([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleFollow = async (channelId, isFollowing) => {
    try {
      if (isFollowing) await api.delete(`/channels/${channelId}/follow`);
      else await api.post(`/channels/${channelId}/follow`);
      fetchChannels();
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!newChannel.name.trim()) return;
    setCreating(true);
    try {
      await api.post('/channels', newChannel);
      setShowCreate(false);
      setNewChannel({ name: '', description: '', category: 'General' });
      fetchChannels();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const filtered = (tab === 'following' ? following : channels).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:'grid', gridTemplateRows:'auto auto auto 1fr', height:'100vh', overflow:'hidden', background:'#0b141a' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-[#2a3942]">
        <button onClick={() => { if (onBack) onBack(); else navigate(-1); }} className="text-[#8696a0] hover:text-white transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white font-semibold text-lg flex-1">Channels</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-sm text-[#00a884] hover:text-[#00c49a] font-medium transition-colors">
          <Plus size={16} /> Create
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-[#111b21]">
        <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
          <Search size={15} className="text-[#8696a0]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search channels..." className="bg-transparent text-white text-sm flex-1 outline-none placeholder-[#8696a0]" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a3942] bg-[#111b21]">
        {[['discover','Discover'],['following','Following']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2 ${tab === key ? 'border-[#00a884] text-[#00a884]' : 'border-transparent text-[#8696a0] hover:text-white'}`}>
            {label} {key === 'following' && following.length > 0 && `(${following.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-8">
            <Megaphone size={48} className="text-[#2a3942] mb-4" />
            <p className="text-[#8696a0] font-medium">
              {tab === 'following' ? "You're not following any channels yet" : 'No channels found'}
            </p>
            <p className="text-[#8696a0] text-sm mt-1">
              {tab === 'following' ? 'Discover and follow channels below' : 'Be the first to create one!'}
            </p>
            {tab === 'following' && (
              <button onClick={() => setTab('discover')} className="mt-4 text-[#00a884] text-sm font-medium">
                Discover channels →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#2a3942]">
            {filtered.map(channel => {
              const isFollowed = following.some(f => f._id === channel._id);
              return (
                <div key={channel._id} className="flex items-start gap-3 px-4 py-4 hover:bg-[#202c33] transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center flex-shrink-0 border border-[#37404a] overflow-hidden">
                    {channel.avatar
                      ? <img src={channel.avatar} alt="" className="w-full h-full object-cover" />
                      : <Hash size={22} className="text-[#00a884]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-semibold text-sm truncate">{channel.name}</p>
                      {channel.verified && <span className="text-[#00a884] text-xs">✓</span>}
                    </div>
                    <p className="text-[#8696a0] text-xs mt-0.5 line-clamp-2">{channel.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[#8696a0] text-xs flex items-center gap-1">
                        <Users size={10} />{(channel.followersCount || 0).toLocaleString()} followers
                      </span>
                      {channel.category && (
                        <span className="text-[#8696a0] text-xs bg-[#2a3942] px-1.5 py-0.5 rounded-full">{channel.category}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollow(channel._id, isFollowed)}
                    className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border
                      ${isFollowed ? 'border-[#37404a] text-[#8696a0] hover:border-red-400 hover:text-red-400' : 'border-[#00a884] text-[#00a884] hover:bg-[#00a884] hover:text-white'}`}>
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60"
          onClick={() => setShowCreate(false)}>
          <div className="bg-[#111b21] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Megaphone size={20} className="text-[#00a884]" /> Create Channel
            </h3>
            <input value={newChannel.name} onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))}
              placeholder="Channel name *" maxLength={50}
              className="w-full bg-[#2a3942] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#00a884] mb-3 placeholder-[#8696a0]" />
            <textarea value={newChannel.description} onChange={e => setNewChannel(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)" maxLength={200} rows={3}
              className="w-full bg-[#2a3942] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#00a884] mb-3 placeholder-[#8696a0] resize-none" />
            <select value={newChannel.category} onChange={e => setNewChannel(p => ({ ...p, category: e.target.value }))}
              className="w-full bg-[#2a3942] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#00a884] mb-4">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-[#8696a0] hover:text-white transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={!newChannel.name.trim() || creating}
                className="flex-1 py-2.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channels;
