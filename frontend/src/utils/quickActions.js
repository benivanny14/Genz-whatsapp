import { authFetch } from './authFetch';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Export chat as TXT/HTML/JSON
 */
export const exportChat = async (conversationId, format = 'txt') => {
  try {
    const res = await authFetch(`${API_URL}/export/chat/${conversationId}/${format}`);
    if (!res.ok) throw new Error('Export failed');
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genz-chat-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Chat exported as ${format.toUpperCase()}`);
    return true;
  } catch (error) {
    toast.error('Export failed: ' + error.message);
    return false;
  }
};

/**
 * Send bulk/mass message to multiple recipients
 */
export const sendBulkMessage = async ({ userIds, content, messageType, mediaUrl }) => {
  try {
    const res = await authFetch(`${API_URL}/bulk/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, content, messageType, mediaUrl }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message || 'Bulk message sent!');
      return data;
    }
    throw new Error(data.message || 'Failed');
  } catch (error) {
    toast.error('Bulk send failed: ' + error.message);
    return null;
  }
};

/**
 * Apply text style (uppercase, capitalize, stylish)
 */
export const applyTextStyle = async (text, action, style = 'bold') => {
  try {
    const res = await authFetch(`${API_URL}/text-tools/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style }),
    });
    const data = await res.json();
    return data?.result || text;
  } catch (error) {
    toast.error('Text tool failed');
    return text;
  }
};

/**
 * Get available stylish text styles
 */
export const getTextStyles = async () => {
  try {
    const res = await authFetch(`${API_URL}/text-tools/styles`);
    const data = await res.json();
    return data?.styles || [];
  } catch {
    return [];
  }
};

/**
 * Repeat text
 */
export const repeatText = async (text, count = 5) => {
  try {
    const res = await authFetch(`${API_URL}/text-tools/repeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, count }),
    });
    const data = await res.json();
    return data?.result || text;
  } catch {
    return text;
  }
};

/**
 * Generate blank/invisible message
 */
export const getBlankMessage = async (spaces = 3) => {
  try {
    const res = await authFetch(`${API_URL}/text-tools/blank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaces }),
    });
    const data = await res.json();
    return data?.result || '';
  } catch {
    return '\u200B\u200B\u200B';
  }
};

/**
 * Watch a user's online status - get notified when they come online
 */
export const watchUserOnline = async (targetUserId) => {
  try {
    const res = await authFetch(`${API_URL}/notifier/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    toast.success(data.message || 'Watching...');
    return data;
  } catch (error) {
    toast.error('Failed to watch user');
    return null;
  }
};

/**
 * Check if a user is currently online
 */
export const checkUserOnline = async (targetUserId) => {
  try {
    const res = await authFetch(`${API_URL}/notifier/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { isOnline: false };
  }
};

/**
 * Generate fake chat conversation with a named friend
 */
export const generateFakeChat = async (friendName, messageCount = 10) => {
  try {
    const res = await authFetch(`${API_URL}/fake-chat/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendName, messageCount }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message || 'Fake chat generated!');
      return data;
    }
    throw new Error(data.message || 'Failed');
  } catch (error) {
    toast.error('Fake chat failed: ' + error.message);
    return null;
  }
};

/**
 * Clear all chats
 */
export const clearAllChats = async () => {
  try {
    const res = await authFetch(`${API_URL}/fake-chat/clear-all`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message || 'All chats cleared!');
      return data;
    }
    throw new Error(data.message || 'Failed');
  } catch (error) {
    toast.error('Clear all failed: ' + error.message);
    return null;
  }
};

/**
 * Download status media
 */
export const downloadStatus = async (statusId) => {
  try {
    const res = await authFetch(`${API_URL}/status/${statusId}/download`);
    if (!res.ok) throw new Error('Download failed');
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genz-status-${statusId}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Status downloaded!');
    return true;
  } catch (error) {
    toast.error('Status download failed');
    return false;
  }
};
