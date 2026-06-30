import { authFetch } from '../utils/authFetch';
import apiUrl from '../utils/apiUrl';

const jsonHeaders = () => ({
  'Content-Type': 'application/json'
});

const formHeaders = () => ({});

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

const statusService = {
  getStatuses: async () => {
    const response = await authFetch(apiUrl('/advanced/status'), {
      headers: jsonHeaders()
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  /** Create status: uploads file first when needed, then POST JSON to /status */
  uploadStatus: async (statusData) => {
    let mediaUrl = '';
    let mediaType = statusData.type || 'text';

    if (statusData.file) {
      const formData = new FormData();
      formData.append('file', statusData.file);
      const upRes = await authFetch(apiUrl('/advanced/status/upload'), {
        method: 'POST',
        headers: formHeaders(),
        body: formData
      });
      const upData = await parseJsonSafe(upRes);
      if (!upRes.ok || !upData.success) {
        throw new Error(upData.message || 'Media upload failed');
      }
      mediaUrl = upData.fileUrl || '';
      mediaType = upData.mediaType || statusData.type;
    }

    const privacy =
      statusData.privacy === 'private' ? 'only_me' : (statusData.privacy || 'everyone');

    const textBody = (statusData.caption || '').trim();
    const payload = {
      type: statusData.type,
      content:
        statusData.type === 'text'
          ? textBody
          : (textBody || ' '),
      mediaUrl,
      mediaType,
      caption: statusData.caption || '',
      backgroundColor: statusData.backgroundColor,
      textColor: statusData.fontColor || statusData.textColor,
      privacy
    };

    const response = await authFetch(apiUrl('/advanced/status'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  deleteStatus: async (statusId) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}`), {
      method: 'DELETE',
      headers: jsonHeaders()
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  viewStatus: async (statusId) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}/view`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({})
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  replyToStatus: async (statusId, replyData) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const body = typeof replyData === 'string' ? { content: replyData } : replyData;
    const response = await authFetch(apiUrl(`/advanced/status/${id}/reply`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body)
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  getStatusViewers: async (statusId) => {
    try {
      const id = encodeURIComponent(statusId.replace('status-', ''));
      const response = await authFetch(apiUrl(`/advanced/status/${id}/viewers`), {
        headers: jsonHeaders()
      });
      if (response.status === 404) return { success: true, viewers: [] };
      const data = await parseJsonSafe(response);
      if (!response.ok) return { success: true, viewers: [] };
      return data;
    } catch {
      return { success: true, viewers: [] };
    }
  },

  getStatusReplies: async (statusId) => {
    try {
      const id = encodeURIComponent(statusId.replace('status-', ''));
      const response = await authFetch(apiUrl(`/advanced/status/${id}/replies`), {
        headers: jsonHeaders()
      });
      if (response.status === 404) return { success: true, replies: [] };
      const data = await parseJsonSafe(response);
      if (!response.ok) return { success: true, replies: [] };
      return data;
    } catch {
      return { success: true, replies: [] };
    }
  },

  getStatusDetails: async (statusId) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}`), {
      headers: jsonHeaders()
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  updateStatusPrivacy: async (statusId, privacy) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}/privacy`), {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ privacy })
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) return { success: false, ...data };
    return data;
  },

  muteStatusUpdates: async (userId, mute) => {
    const response = await authFetch(apiUrl(`/advanced/status/mute/${encodeURIComponent(userId)}`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ mute })
    });
    return parseJsonSafe(response);
  },

  archiveStatus: async (statusId) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}/archive`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getArchivedStatuses: async () => {
    const response = await authFetch(apiUrl('/advanced/status/archived'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  reportStatus: async (statusId, reason) => {
    const id = encodeURIComponent(statusId.replace('status-', ''));
    const response = await authFetch(apiUrl(`/advanced/status/${id}/report`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ reason })
    });
    return parseJsonSafe(response);
  },

  getStatusStats: async () => {
    const response = await authFetch(apiUrl('/advanced/status/stats'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  uploadStatusMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await authFetch(apiUrl('/advanced/status/upload'), {
      method: 'POST',
      headers: formHeaders(),
      body: formData
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }
};

export default statusService;
