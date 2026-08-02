import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Globe2, Lock, Plus, Search, Settings, UserPlus, UsersRound, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import communityService from '../services/communityService';

const DEFAULT_COMMUNITIES = [
  {
    id: 'announcements',
    name: 'GENZ Announcements',
    description: 'Official announcements and important updates.',
    members: 1280,
    groups: 4,
    public: true,
    joined: true,
  },
  {
    id: 'business',
    name: 'Business Hub',
    description: 'Sales, customers, catalogues, and support teams.',
    members: 740,
    groups: 7,
    public: true,
    joined: false,
  },
  {
    id: 'family',
    name: 'Family Circle',
    description: 'Private groups under one family community.',
    members: 36,
    groups: 3,
    public: false,
    joined: true,
  },
];

const Communities = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('joined');
  const [query, setQuery] = useState('');
  const [communities, setCommunities] = useState([]);
  const [draft, setDraft] = useState({ name: '', description: '', public: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await communityService.getCommunities();
        if (active) setCommunities(data);
      } catch (err) {
        if (active) setCommunities(DEFAULT_COMMUNITIES);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3200);
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return communities.filter((community) => {
      const matchesQuery =
        !normalizedQuery ||
        community.name.toLowerCase().includes(normalizedQuery) ||
        community.description.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;
      if (activeTab === 'joined') return community.joined;
      if (activeTab === 'discover') return !community.joined;
      return true;
    });
  }, [activeTab, communities, query]);

  const createCommunity = async () => {
    const name = draft.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      const community = await communityService.createCommunity({
        name,
        description: draft.description.trim() || 'Community description',
        public: draft.public
      });
      setCommunities((current) => [community, ...current]);
      setDraft({ name: '', description: '', public: true });
      setActiveTab('joined');
      showNotice('success', 'Community created.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to create community.');
    } finally {
      setSaving(false);
    }
  };

  const joinCommunity = async (communityId) => {
    try {
      const updated = await communityService.joinCommunity(communityId);
      setCommunities((current) =>
        current.map((community) =>
          community.id === communityId ? { ...community, ...updated } : community
        )
      );
      showNotice('success', 'Joined community.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to join community.');
    }
  };

  const leaveCommunity = async (communityId) => {
    try {
      const updated = await communityService.leaveCommunity(communityId);
      setCommunities((current) =>
        current.map((community) =>
          community.id === communityId ? { ...community, ...updated } : community
        )
      );
      showNotice('success', 'Left community.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to leave community.');
    }
  };

  const deleteCommunity = async (communityId) => {
    if (!window.confirm('Delete this community permanently?')) return;
    try {
      await communityService.deleteCommunity(communityId);
      setCommunities((current) => current.filter((community) => community.id !== communityId));
      showNotice('success', 'Community deleted.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete community.');
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b141a] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#111b21] px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Back to chats"
        >
          <ArrowLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold">Communities</h1>
          <p className="truncate text-xs text-white/45">Create, join, and organize groups under one place.</p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-24 md:pb-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {notice && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-[#25d366]/40 bg-[#25d366]/10 text-[#25d366]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
              {notice.text}
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-white/55">
              <RefreshCw size={16} className="animate-spin" /> Loading communities...
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search communities"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white outline-none placeholder:text-white/30 focus:border-[#25d366]/70"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-1">
            {[
              ['joined', 'My Communities'],
              ['discover', 'Discover'],
              ['create', 'Create'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`rounded-lg px-2 py-2 text-sm font-semibold transition ${
                  activeTab === id ? 'bg-[#008069] text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'create' ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#25d366]">
                  <Plus size={22} />
                </span>
                <div>
                  <h2 className="font-bold">Create Community</h2>
                  <p className="text-xs text-white/45">Start with an announcement group and add groups later.</p>
                </div>
              </div>

              <div className="grid gap-3">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Community name"
                  className="rounded-xl border border-white/10 bg-[#111b21] px-3 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#25d366]/70"
                />
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Description"
                  rows={3}
                  className="resize-none rounded-xl border border-white/10 bg-[#111b21] px-3 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#25d366]/70"
                />
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, public: !current.public }))}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111b21] px-3 py-3 text-left"
                  aria-pressed={draft.public}
                >
                  <span>
                    <span className="block text-sm font-semibold">{draft.public ? 'Public community' : 'Private community'}</span>
                    <span className="text-xs text-white/45">{draft.public ? 'People can discover and join it.' : 'Only invited people can join it.'}</span>
                  </span>
                  {draft.public ? <Globe2 className="text-[#25d366]" size={20} /> : <Lock className="text-white/50" size={20} />}
                </button>
                <button
                  type="button"
                  onClick={createCommunity}
                  disabled={!draft.name.trim() || saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#008069] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#007a5e] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus size={18} /> {saving ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </section>
          ) : (
            <section className="grid gap-3">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-12 text-center text-white/45">
                  <UsersRound size={42} className="mx-auto mb-3 opacity-40" />
                  <p className="font-semibold">No communities here yet</p>
                </div>
              ) : (
                filtered.map((community) => (
                  <article key={community.id} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#25d366]">
                        <UsersRound size={23} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-bold">{community.name}</h2>
                          {community.public ? <Globe2 size={15} className="text-white/35" /> : <Lock size={15} className="text-white/35" />}
                        </div>
                        <p className="mt-1 text-sm text-white/55">{community.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                          <span>{community.members.toLocaleString()} members</span>
                          <span>{community.groups} groups</span>
                          <span>Announcements ready</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {community.joined ? (
                        <>
                          <button type="button" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
                            <Settings size={16} /> Manage
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCommunity(community.id)}
                            title="Delete community"
                            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/15"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => leaveCommunity(community.id)}
                            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-500/15"
                          >
                            Leave
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => joinCommunity(community.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#008069] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#007a5e]"
                        >
                          <UserPlus size={16} /> Join Community
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Communities;
