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

    const privacy = statusData.privacy || 'contacts';

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
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/advanced/status/${id}`), {
      method: 'DELETE',
      headers: jsonHeaders()
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  viewStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
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
    const id = encodeURIComponent(statusId);
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
      const id = encodeURIComponent(statusId);
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
      const id = encodeURIComponent(statusId);
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
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/advanced/status/${id}`), {
      headers: jsonHeaders()
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  },

  updateStatusPrivacy: async (statusId, privacy) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/advanced/status/${id}/privacy`), {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ privacy })
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) return { success: false, ...data };
    return data;
  },

  muteStatusUpdates: async (statusId, mute) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/mute`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ duration: mute ? undefined : 0 })
    });
    return parseJsonSafe(response);
  },

  archiveStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/archive`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getArchivedStatuses: async () => {
    const response = await authFetch(apiUrl('/status-advanced/archived'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  reportStatus: async (statusId, reason) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/report`), {
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
  },

  // Advanced status methods
  scheduleStatus: async (statusId, scheduledFor) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/schedule`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ scheduledFor })
    });
    return parseJsonSafe(response);
  },

  createPoll: async (statusId, pollData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/poll`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(pollData)
    });
    return parseJsonSafe(response);
  },

  votePoll: async (statusId, voteData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/poll/vote`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(voteData)
    });
    return parseJsonSafe(response);
  },

  addLocation: async (statusId, locationData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/location`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(locationData)
    });
    return parseJsonSafe(response);
  },

  getLocation: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/location`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  addReaction: async (statusId, emoji) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/react`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ emoji })
    });
    return parseJsonSafe(response);
  },

  getReactions: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/reactions`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  createTemplate: async (templateData) => {
    const response = await authFetch(apiUrl('/status-advanced/template'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(templateData)
    });
    return parseJsonSafe(response);
  },

  getTemplates: async () => {
    const response = await authFetch(apiUrl('/status-advanced/templates'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  saveDraft: async (draftData) => {
    const response = await authFetch(apiUrl('/status-advanced/draft'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(draftData)
    });
    return parseJsonSafe(response);
  },

  getDrafts: async () => {
    const response = await authFetch(apiUrl('/status-advanced/drafts'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  deleteDraft: async (draftId) => {
    const response = await authFetch(apiUrl(`/status-advanced/drafts/${draftId}`), {
      method: 'DELETE',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  favoriteStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/favorite`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getFavorites: async () => {
    const response = await authFetch(apiUrl('/status-advanced/favorites'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getHistory: async () => {
    const response = await authFetch(apiUrl('/status-advanced/history'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getPinnedStatuses: async () => {
    const response = await authFetch(apiUrl('/status-advanced/pinned'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getTrendingHashtags: async () => {
    const response = await authFetch(apiUrl('/status-advanced/hashtags/trending'), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  addHashtags: async (statusId, hashtags) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/hashtags`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ hashtags })
    });
    return parseJsonSafe(response);
  },

  editStatus: async (statusId, editData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/edit`), {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(editData)
    });
    return parseJsonSafe(response);
  },

  duplicateStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/duplicate`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  pinStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/pin`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  shareStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/share`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  downloadStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/download`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  saveToCollection: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/save`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  forwardStatus: async (statusId, forwardData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/forward`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(forwardData)
    });
    return parseJsonSafe(response);
  },

  getInsights: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/insights`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getAnalytics: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/analytics`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  applyVoiceChanger: async (statusId, voiceData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/voice-changer`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(voiceData)
    });
    return parseJsonSafe(response);
  },

  textToSpeech: async (statusId, ttsData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/text-to-speech`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(ttsData)
    });
    return parseJsonSafe(response);
  },

  addCollaborator: async (statusId, collaboratorData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/collaborate`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(collaboratorData)
    });
    return parseJsonSafe(response);
  },

  getCollaboration: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/collaboration`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  updateCollaboration: async (statusId, collaborationData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/collaboration`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(collaborationData)
    });
    return parseJsonSafe(response);
  },

  contributeToCollaboration: async (statusId, contributionData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/contribute`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(contributionData)
    });
    return parseJsonSafe(response);
  },

  addMention: async (statusId, mentionData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/mention`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(mentionData)
    });
    return parseJsonSafe(response);
  },

  getMentions: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/mentions`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  blockUserStatus: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/block`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  getAccessibility: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/accessibility`), {
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  updateAccessibility: async (statusId, accessibilityData) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/accessibility`), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(accessibilityData)
    });
    return parseJsonSafe(response);
  },

  generateAltText: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/alt-text`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  generateCaptions: async (statusId) => {
    const id = encodeURIComponent(statusId);
    const response = await authFetch(apiUrl(`/status-advanced/${id}/captions`), {
      method: 'POST',
      headers: jsonHeaders()
    });
    return parseJsonSafe(response);
  },

  generateQRCode: async (statusId) => {
    const response = await authFetch(apiUrl('/status-advanced/qr'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ statusId })
    });
    return parseJsonSafe(response);
  }
};

export default statusService;
