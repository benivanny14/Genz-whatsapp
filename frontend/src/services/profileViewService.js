import { authFetch } from '../utils/authFetch';
import apiUrl from '../utils/apiUrl';

const profileViewService = {
  // Call this whenever the current user opens someone else's profile/contact info screen
  recordView: async (userId) => {
    try {
      const res = await authFetch(apiUrl(`/api/profile-views/view/${userId}`), {
        method: 'POST'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      // Non-critical — never block the UI if this fails
      console.warn('profileViewService.recordView failed:', error.message);
      return { success: false };
    }
  },

  getMyViewers: async () => {
    const res = await authFetch(apiUrl('/api/profile-views/viewers'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  clearViewers: async () => {
    const res = await authFetch(apiUrl('/api/profile-views/viewers'), { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
};

export default profileViewService;
