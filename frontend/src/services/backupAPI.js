import { authFetch } from '../utils/authFetch';
import { getDeviceId } from '../utils/deviceIdentity';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

const headers = () => ({
  'Content-Type': 'application/json',
  'x-device-id': getDeviceId()
});

const request = async (path, options = {}) => {
  try {
    const response = await authFetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers(),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data : { success: false, message: data.message || `Request failed with ${response.status}` };
  } catch (error) {
    console.error('Backup API error:', error);
    return { success: false, message: error.message };
  }
};

export const createBackup = () => request('/backup/create', { method: 'POST' });
export const listBackups = () => request('/backup/list');
export const restoreBackup = (backupId) => request(`/backup/restore/${encodeURIComponent(backupId)}`, { method: 'POST' });
export const deleteBackup = (backupId) => request(`/backup/${encodeURIComponent(backupId)}`, { method: 'DELETE' });
export const scheduleBackup = (interval = 'daily', enabled = true) => request('/backup/schedule', {
  method: 'POST',
  body: JSON.stringify({ interval, enabled })
});
export const getBackupStatus = () => request('/backup/status');
