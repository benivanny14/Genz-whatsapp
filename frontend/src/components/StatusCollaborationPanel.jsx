import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect, useRef } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Users, Plus, UserPlus, Share2, Lock, Unlock, Clock, CheckCircle, AlertCircle, Eye, MessageCircle, Edit, User, Image as ImageIcon, Send } from 'lucide-react';

const StatusCollaborationPanel = ({ onClose, status, onCollaborationUpdate }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [collabMode, setCollabMode] = useState('view');
  const [isPublic, setIsPublic] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowEdits, setAllowEdits] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [maxCollaborators, setMaxCollaborators] = useState(10);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState('');
  const [contributeFile, setContributeFile] = useState(null);
  const [contributeCaption, setContributeCaption] = useState('');
  const [contributing, setContributing] = useState(false);
  const contributeInputRef = useRef(null);
  const statusId = status?._id || status?.id;

  const modes = [
    { id: 'view', label: 'View Only', icon: Eye },
    { id: 'comment', label: 'Comment', icon: MessageCircle },
    { id: 'edit', label: 'Edit', icon: Edit }
  ];

  const authHeaders = () => {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    // Load collaboration settings for this status
    const loadCollaborationSettings = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/collaboration`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success) {
          const settings = data.collaboration || {};
          setCollaborators(settings.collaborators || []);
          setCollabMode(settings.collabMode || 'view');
          setIsPublic(settings.isPublic || false);
          setAllowComments(settings.allowComments !== false);
          setAllowEdits(settings.allowEdits || false);
          setExpiryDate(settings.expiryDate || '');
          setMaxCollaborators(settings.maxCollaborators || 10);
        }
      } catch (error) {
        console.error('Error loading collaboration settings:', error);
        // Fallback to localStorage
        try {
          const settings = JSON.parse(localStorage.getItem('genz_status_collaboration') || '{}');
          if (statusId && settings[statusId]) {
            const statusSettings = settings[statusId];
            setCollaborators(statusSettings.collaborators || []);
            setCollabMode(statusSettings.collabMode || 'view');
            setIsPublic(statusSettings.isPublic || false);
            setAllowComments(statusSettings.allowComments !== false);
            setAllowEdits(statusSettings.allowEdits || false);
            setExpiryDate(statusSettings.expiryDate || '');
            setMaxCollaborators(statusSettings.maxCollaborators || 10);
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      } finally {
        setLoading(false);
      }
    };
    loadCollaborationSettings();
  }, [statusId]);

  const handleAddCollaborator = async (username) => {
    if (!username || !username.trim()) return;
    if (collaborators.length >= maxCollaborators) {
      alert(`Maximum ${maxCollaborators} collaborators allowed`);
      return;
    }
    setAddingUser(true);
    setError('');
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ collabUsername: username.trim() })
      });
      const data = await response.json();
      if (data.success) {
        const updated = data.status?.collaborators || [];
        setCollaborators(updated.map((c) => ({ userId: c.userId || c.user, username: c.username, role: c.role })));
        alert('Collaborator added');
      } else {
        setError(data.message || 'Could not add collaborator');
        alert(data.message || 'Could not add collaborator');
      }
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError('Could not add collaborator');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveCollaborator = (userId) => {
    setCollaborators(collaborators.filter(c => (c.userId || c.user || c.id) !== userId));
  };

  const handleContribute = async () => {
    if (!contributeFile && !contributeCaption.trim()) {
      setError('Chagua file au andika maandishi');
      return;
    }
    setContributing(true);
    setError('');
    try {
      const token = getAuthToken();
      let mediaUrl = '';
      let mediaType = 'text';
      let type = 'text';

      if (contributeFile) {
        const formData = new FormData();
        formData.append('file', contributeFile);
        const uploadRes = await fetch(`${resolveApiBase()}/advanced/status/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.message || 'Upload failed');
        mediaUrl = uploadData.fileUrl || '';
        mediaType = uploadData.mediaType || 'image';
        type = mediaType;
      }

      const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/contribute`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type,
          mediaUrl,
          mediaType,
          caption: contributeCaption.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Umepost contribution yako kwenye story!');
        setContributeFile(null);
        setContributeCaption('');
        if (contributeInputRef.current) contributeInputRef.current.value = '';
      } else {
        setError(data.message || 'Could not contribute');
      }
    } catch (err) {
      console.error('Contribute error:', err);
      setError(err.message || 'Could not contribute');
    } finally {
      setContributing(false);
    }
  };

  const handleSave = async () => {
    if (!statusId) return;

    const collaborationSettings = {
      collaborators,
      collabMode,
      isPublic,
      allowComments,
      allowEdits,
      expiryDate,
      maxCollaborators
    };

    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/collaboration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(collaborationSettings)
      });

      const data = await response.json();
      if (data.success) {
        if (onCollaborationUpdate) {
          onCollaborationUpdate(collaborationSettings);
        }
        onClose();
      } else {
        setError(data.message || 'Failed to save collaboration settings');
      }
    } catch (error) {
      console.error('Error saving collaboration settings:', error);
      // Fallback to localStorage
      try {
        const settings = JSON.parse(localStorage.getItem('genz_status_collaboration') || '{}');
        settings[statusId] = collaborationSettings;
        localStorage.setItem('genz_status_collaboration', JSON.stringify(settings));

        if (onCollaborationUpdate) {
          onCollaborationUpdate(collaborationSettings);
        }
        onClose();
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Users className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Collaboration</h2>
              <p className="text-white/60 text-xs">Share and collaborate on status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Collaboration Mode */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Collaboration Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setCollabMode(mode.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      collabMode === mode.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public/Private */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              {isPublic ? <Unlock className="text-[#00a884]" size={20} /> : <Lock className="text-white/60" size={20} />}
              <div>
                <p className="text-white font-medium">{isPublic ? 'Public' : 'Private'}</p>
                <p className="text-white/60 text-xs">{isPublic ? 'Anyone with link can view' : 'Only collaborators can view'}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
            </label>
          </div>

          {/* Allow Comments */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="text-blue-400" size={20} />
              <div>
                <p className="text-white font-medium">Allow Comments</p>
                <p className="text-white/60 text-xs">Collaborators can comment</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
            </label>
          </div>

          {/* Allow Edits */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Edit className="text-green-400" size={20} />
              <div>
                <p className="text-white font-medium">Allow Edits</p>
                <p className="text-white/60 text-xs">Collaborators can edit</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowEdits}
                onChange={(e) => setAllowEdits(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
            </label>
          </div>

          {/* Max Collaborators */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Max Collaborators</label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxCollaborators}
              onChange={(e) => setMaxCollaborators(Number(e.target.value))}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Collaborators List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium">Collaborators ({collaborators.length}/{maxCollaborators})</p>
              <button
                onClick={() => {
                  const name = prompt('Enter collaborator username:');
                  if (name && name.trim()) {
                    handleAddCollaborator(name.trim());
                  }
                }}
                disabled={addingUser}
                className="text-[#00a884] text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <UserPlus size={14} />
                {addingUser ? 'Adding...' : 'Add'}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg px-3 py-2 mb-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <div className="space-y-2">
              {collaborators.length === 0 ? (
                <div className="text-center text-white/40 py-4">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No collaborators yet</p>
                  <p className="text-xs mt-1">Add collaborators by username to build a shared story</p>
                </div>
              ) : (
                collaborators.map((collab, index) => {
                  const collabId = collab.userId || collab.user || collab.id || index;
                  return (
                    <div key={String(collabId)} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                          <User size={16} className="text-[#00a884]" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{collab.username || collab.name || `User ${String(collabId).slice(0, 8)}`}</p>
                          <p className="text-white/40 text-xs capitalize">{collab.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCollaborator(collabId)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Contribute to this story */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="text-[#00a884]" size={18} />
              <p className="text-white font-medium">Contribute to this story</p>
            </div>
            <p className="text-white/40 text-xs mb-3">
              Add your own photo, video or text to this shared story (Instagram-style).
            </p>
            <input
              ref={contributeInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={(e) => setContributeFile(e.target.files[0] || null)}
              className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 text-sm mb-2 file:mr-2 file:px-3 file:py-1 file:rounded file:bg-[#00a884] file:text-white file:border-0"
            />
            <textarea
              value={contributeCaption}
              onChange={(e) => setContributeCaption(e.target.value)}
              placeholder="Add a caption..."
              rows={2}
              className="w-full bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 text-sm mb-2 resize-none placeholder-white/40"
            />
            <button
              onClick={handleContribute}
              disabled={contributing}
              className="w-full px-3 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={16} />
              {contributing ? 'Posting...' : 'Post to story'}
            </button>
          </div>

          {/* Share Link */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="text-[#00a884]" size={18} />
              <p className="text-white font-medium">Share Link</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/status/${status?._id || status?.id}`}
                className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 text-sm"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/status/${status?._id || status?.id}`);
                    alert('Link copied to clipboard');
                  } catch (err) {
                    alert('Could not copy link');
                  }
                }}
                className="px-3 py-2 bg-[#00a884] rounded-lg text-white text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Save Collaboration Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusCollaborationPanel;
