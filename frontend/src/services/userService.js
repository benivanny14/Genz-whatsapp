/**
 * userService.js
 * Handles all user-related API calls: profile, contacts, status, blocking
 */
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const userService = {
  // ── Profile ──────────────────────────────────────────────────────
  getProfile: async () => {
    const res = await authFetch(`${API_URL}/auth/me`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  updateProfile: async (data) => {
    const res = await authFetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  uploadProfilePicture: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await authFetch(`${API_URL}/auth/profile/picture`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Failed to upload profile picture');
    return res.json();
  },

  // ── Contacts ─────────────────────────────────────────────────────
  getContacts: async () => {
    const res = await authFetch(`${API_URL}/chat/contacts`);
    if (!res.ok) return [];
    return res.json();
  },

  searchUsers: async (query) => {
    const res = await authFetch(`${API_URL}/chat/users/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  },

  // ── User Settings ─────────────────────────────────────────────────
  updateAbout: async (about) => {
    const res = await authFetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ about }),
    });
    if (!res.ok) throw new Error('Failed to update about');
    return res.json();
  },

  getSettings: async () => {
    const res = await authFetch(`${API_URL}/auth/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings) => {
    const res = await authFetch(`${API_URL}/auth/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  updateOnlineStatus: async (isOnline) => {
    const res = await authFetch(`${API_URL}/genz-mods/online-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline }),
    });
    if (!res.ok) throw new Error('Failed to update online status');
    return res.json();
  },

  // ── Block / Unblock ───────────────────────────────────────────────
  blockUser: async (userId) => {
    const res = await authFetch(`${API_URL}/chat/users/${userId}/block`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to block user');
    return res.json();
  },

  unblockUser: async (userId) => {
    const res = await authFetch(`${API_URL}/chat/users/${userId}/block`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to unblock user');
    return res.json();
  },

  getBlockedUsers: async () => {
    const res = await authFetch(`${API_URL}/auth/blocked`);
    if (!res.ok) return [];
    return res.json();
  },

  // ── GENZ Mods Settings ───────────────────────────────────────────
  getModsSettings: async () => {
    const res = await authFetch(`${API_URL}/genz-mods/settings`);
    if (!res.ok) return {};
    return res.json();
  },

  updateModsSettings: async (settings) => {
    const res = await authFetch(`${API_URL}/genz-mods/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update mods settings');
    return res.json();
  },

  // ── Subscription ─────────────────────────────────────────────────
  getSubscriptionStatus: async () => {
    const res = await authFetch(`${API_URL}/payment/subscription`);
    if (!res.ok) return { isActive: false, hasSubscription: false };
    return res.json();
  },

  // ── Account Management ───────────────────────────────────────────
  changeNumber: async (newPhoneNumber) => {
    const res = await authFetch(`${API_URL}/auth/change-number`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPhoneNumber }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to change number');
    }
    return res.json();
  },

  deleteAccount: async () => {
    const res = await authFetch(`${API_URL}/auth/delete-account`, {
      method: 'POST'
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to delete account');
    }
    return res.json();
  },

  updatePrivacyExceptions: async (exceptions) => {
    const res = await authFetch(`${API_URL}/auth/privacy-exceptions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptions }),
    });
    if (!res.ok) throw new Error('Failed to update privacy exceptions');
    return res.json();
  },
};

export default userService;
