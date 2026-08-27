import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useUser } from './UserContext';
import { getSocket } from '../services/socket';
import { resolveApiBase } from '../utils/resolveApiBase';
import { getAuthToken } from '../utils/tokenStore';

const StatusContext = createContext(null);

export const useStatusContext = () => {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error('useStatusContext must be used within StatusProvider');
  return ctx;
};

const API_BASE = () => resolveApiBase();

const authHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const StatusProvider = ({ children }) => {
  const { user } = useUser();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all statuses ──
  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE()}/status`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setStatuses(data.statuses || []);
      } else {
        setError(data.message || 'Failed to fetch statuses');
      }
    } catch (err) {
      console.error('Fetch statuses error:', err);
      setError('Failed to fetch statuses');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create text status ──
  const createTextStatus = useCallback(async (textData) => {
    try {
      const res = await fetch(`${API_BASE()}/status`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type: 'text',
          textStatus: textData
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatuses();
        return data;
      }
      throw new Error(data.message || 'Failed to create status');
    } catch (err) {
      console.error('Create text status error:', err);
      throw err;
    }
  }, [fetchStatuses]);

  // ── Create media status (image/video) ──
  const createMediaStatus = useCallback(async (formData) => {
    try {
      const token = getAuthToken();
      const uploadRes = await fetch(`${API_BASE()}/status/upload`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error('Upload failed');

      const file = formData.get('file');
      const type = file?.type?.startsWith('image/') ? 'image' : 'video';

      const res = await fetch(`${API_BASE()}/status`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type,
          content: uploadData.fileUrl,
          caption: formData.get('caption') || '',
          music: formData.get('music') ? JSON.parse(formData.get('music')) : undefined,
          duration: Number(formData.get('duration')) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatuses();
        return data;
      }
      throw new Error(data.message || 'Failed to create media status');
    } catch (err) {
      console.error('Create media status error:', err);
      throw err;
    }
  }, [fetchStatuses]);

  // ── View status ──
  const viewStatus = useCallback(async (statusId) => {
    try {
      const res = await fetch(`${API_BASE()}/status/${statusId}/view`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setStatuses(prev => prev.map(s => {
          if (s._id === statusId) {
            return { ...s, isViewed: true, viewCount: data.viewCount || s.viewCount };
          }
          return s;
        }));
      }
      return data;
    } catch (err) {
      console.error('View status error:', err);
    }
  }, []);

  // ── Delete status ──
  const deleteStatus = useCallback(async (statusId) => {
    try {
      const res = await fetch(`${API_BASE()}/status/${statusId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setStatuses(prev => prev.filter(s => s._id !== statusId));
      }
      return data;
    } catch (err) {
      console.error('Delete status error:', err);
      throw err;
    }
  }, []);

  // ── Mute status user ──
  const muteStatus = useCallback(async (statusId) => {
    try {
      const res = await fetch(`${API_BASE()}/status/${statusId}/mute`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatuses();
      }
      return data;
    } catch (err) {
      console.error('Mute status error:', err);
    }
  }, [fetchStatuses]);

  // ── Unmute status user ──
  const unmuteStatus = useCallback(async (statusId) => {
    try {
      const res = await fetch(`${API_BASE()}/status/${statusId}/unmute`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.success) {
        await fetchStatuses();
      }
      return data;
    } catch (err) {
      console.error('Unmute status error:', err);
    }
  }, [fetchStatuses]);

  // ── React to status ──
  const reactToStatus = useCallback(async (statusId, emoji) => {
    try {
      const res = await fetch(`${API_BASE()}/status/${statusId}/react`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ emoji })
      });
      return await res.json();
    } catch (err) {
      console.error('React to status error:', err);
    }
  }, []);

  // ── Listen for socket events ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCreated = (status) => {
      const posterName = status?.username || status?.userId?.username || 'Someone';
      if (status?.userId?._id !== user?._id) {
        toast(`${posterName} uploaded a new status 🟢`, { duration: 3000 });
      }
      setStatuses(prev => {
        const exists = prev.some(s => s._id === status._id);
        if (exists) return prev;
        return [status, ...prev];
      });
    };

    const handleDeleted = ({ statusId }) => {
      setStatuses(prev => prev.filter(s => s._id !== statusId));
    };

    const handleViewed = ({ statusId, _id, viewCount, viewsCount }) => {
      const id = statusId || _id;
      const nextCount = viewCount ?? viewsCount;
      setStatuses(prev => prev.map(s =>
        s._id === id ? { ...s, viewCount: nextCount ?? s.viewCount, viewsCount: nextCount ?? s.viewsCount } : s
      ));
    };

    socket.on('status:created', handleCreated);
    socket.on('status:deleted', handleDeleted);
    socket.on('status:viewed', handleViewed);

    return () => {
      socket.off('status:created', handleCreated);
      socket.off('status:deleted', handleDeleted);
      socket.off('status:viewed', handleViewed);
    };
  }, []);

  // ── Auto-fetch on mount when user is available ──
  useEffect(() => {
    if (user) {
      fetchStatuses();
    }
  }, [user, fetchStatuses]);

  const value = {
    statuses,
    currentUser: user,
    loading,
    error,
    fetchStatuses,
    createTextStatus,
    createMediaStatus,
    viewStatus,
    deleteStatus,
    muteStatus,
    unmuteStatus,
    reactToStatus,
    setStatuses
  };

  return (
    <StatusContext.Provider value={value}>
      {children}
    </StatusContext.Provider>
  );
};

export { StatusProvider };
export default StatusContext;
