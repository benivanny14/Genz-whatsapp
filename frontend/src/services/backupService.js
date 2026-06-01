import { authFetch } from '../utils/authFetch';
import { getDeviceId } from '../utils/deviceIdentity';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = API_ORIGIN.endsWith('/api') ? API_ORIGIN : `${API_ORIGIN}/api`;

const headers = () => ({
  'Content-Type': 'application/json',
  'x-device-id': getDeviceId()
});

const request = async (path, options = {}) => {
  const response = await authFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || data.error || `Backup request failed with ${response.status}`);
  }

  return data;
};

class BackupService {
  constructor() {
    this.isInitialized = false;
    this.backupInProgress = false;
    this.restoreInProgress = false;
  }

  async initialize() {
    this.isInitialized = true;
    return true;
  }

  async backupChat(options = {}) {
    if (this.backupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.backupInProgress = true;
    try {
      return await request('/backup/create', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    } finally {
      this.backupInProgress = false;
    }
  }

  async restoreChat(backupId) {
    if (!backupId) {
      throw new Error('Backup ID is required');
    }
    if (this.restoreInProgress) {
      throw new Error('Restore already in progress');
    }

    this.restoreInProgress = true;
    try {
      return await request(`/backup/restore/${encodeURIComponent(backupId)}`, {
        method: 'POST'
      });
    } finally {
      this.restoreInProgress = false;
    }
  }

  async listBackups() {
    const data = await request('/backup/list');
    return data.backups || [];
  }

  async deleteBackup(backupId) {
    if (!backupId) {
      throw new Error('Backup ID is required');
    }
    await request(`/backup/${encodeURIComponent(backupId)}`, {
      method: 'DELETE'
    });
    return true;
  }

  async scheduleBackup(interval = 'daily', enabled = true) {
    return request('/backup/schedule', {
      method: 'POST',
      body: JSON.stringify({ interval, enabled })
    });
  }

  async getStatus() {
    return request('/backup/status');
  }

  isBackingUp() {
    return this.backupInProgress;
  }

  isRestoring() {
    return this.restoreInProgress;
  }

  getProgress() {
    return {
      backupInProgress: this.backupInProgress,
      restoreInProgress: this.restoreInProgress
    };
  }

  cleanup() {
    this.isInitialized = false;
    this.backupInProgress = false;
    this.restoreInProgress = false;
  }
}

const backupService = new BackupService();

export default backupService;
export { BackupService };
