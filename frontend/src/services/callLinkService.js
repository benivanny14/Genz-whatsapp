import { authFetch } from '../utils/authFetch';
import apiUrl from '../utils/apiUrl';

const callLinkService = {
  create: async ({ conversationId = null, callType = 'voice' } = {}) => {
    const res = await authFetch(apiUrl('/api/calls/link'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, callType })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  resolve: async (token) => {
    const res = await authFetch(apiUrl(`/api/calls/link/${token}`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  join: async (token) => {
    const res = await authFetch(apiUrl(`/api/calls/link/${token}/join`), { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  revoke: async (token) => {
    const res = await authFetch(apiUrl(`/api/calls/link/${token}`), { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
};

export default callLinkService;
