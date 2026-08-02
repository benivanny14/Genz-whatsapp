import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = `${resolveApiBase()}/communities`;

const normalizeCommunity = (c = {}) => ({
  id: c.id || c._id,
  _id: c._id || c.id,
  name: c.name || 'Untitled community',
  description: c.description || '',
  public: !!c.public,
  members: Number(c.members) || 0,
  groups: Number(c.groups) || 0,
  joined: !!c.joined,
  createdBy: c.createdBy || '',
  createdAt: c.createdAt || null
});

const communityService = {
  getCommunities: async () => {
    const res = await authFetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch communities');
    const data = await res.json();
    return (data.communities || []).map(normalizeCommunity);
  },

  createCommunity: async (payload) => {
    const res = await authFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create community');
    const data = await res.json();
    return normalizeCommunity(data.community);
  },

  joinCommunity: async (id) => {
    const res = await authFetch(`${API_URL}/${id}/join`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to join community');
    const data = await res.json();
    return normalizeCommunity(data.community);
  },

  leaveCommunity: async (id) => {
    const res = await authFetch(`${API_URL}/${id}/leave`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to leave community');
    const data = await res.json();
    return normalizeCommunity(data.community);
  },

  deleteCommunity: async (id) => {
    const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete community');
    return res.json();
  }
};

export default communityService;
