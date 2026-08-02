import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = `${resolveApiBase()}/explore`;

const exploreService = {
  getExplore: async () => {
    const res = await authFetch(API_URL);
    if (!res.ok) throw new Error('Failed to load explore data');
    return res.json();
  },

  search: async (query) => {
    const res = await authFetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search');
    return res.json();
  }
};

export default exploreService;
