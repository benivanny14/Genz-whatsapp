import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, FileText, Clock, Trash2, Edit, Send, Plus } from 'lucide-react';

const StatusDraftsPanel = ({ onClose, onDraftSelect, onDraftDelete }) => {
  const [drafts, setDrafts] = useState([]);
  const [showCreateDraft, setShowCreateDraft] = useState(false);
  const [newDraftContent, setNewDraftContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/drafts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      // Fallback to localStorage
      try {
        const savedDrafts = JSON.parse(localStorage.getItem('genz_status_drafts') || '[]');
        setDrafts(savedDrafts);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!newDraftContent.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${resolveApiBase()}/status-advanced/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'text',
          content: newDraftContent
        })
      });
      await loadDrafts();
    } catch (error) {
      console.error('Error creating draft:', error);
      // Fallback to localStorage
      const newDraft = {
        id: Date.now().toString(),
        content: newDraftContent,
        type: 'text',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updated = [newDraft, ...drafts];
      setDrafts(updated);
      localStorage.setItem('genz_status_drafts', JSON.stringify(updated));
    }

    setNewDraftContent('');
    setShowCreateDraft(false);
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${resolveApiBase()}/status-advanced/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      // Fallback to localStorage
      const updated = drafts.filter(d => d._id !== draftId);
      setDrafts(updated);
      localStorage.setItem('genz_status_drafts', JSON.stringify(updated));
    }

    if (onDraftDelete) {
      onDraftDelete(draftId);
    }
  };

  const handleEditDraft = (draft) => {
    setNewDraftContent(draft.content);
    setShowCreateDraft(true);
  };

  const handleSelectDraft = (draft) => {
    if (onDraftSelect) {
      onDraftSelect(draft);
    }
    onClose();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all drafts?')) {
      setDrafts([]);
      localStorage.setItem('genz_status_drafts', JSON.stringify([]));
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <FileText className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Drafts</h2>
              <p className="text-white/60 text-xs">{drafts.length} saved drafts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Create New Draft */}
          {!showCreateDraft ? (
            <button
              onClick={() => setShowCreateDraft(true)}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl border-2 border-dashed border-white/20 hover:border-[#00a884]/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} className="text-[#00a884]" />
              <span className="text-white font-medium">Create New Draft</span>
            </button>
          ) : (
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <textarea
                value={newDraftContent}
                onChange={(e) => setNewDraftContent(e.target.value)}
                placeholder="Write your status draft..."
                rows={3}
                className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateDraft}
                  disabled={!newDraftContent.trim()}
                  className="flex-1 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Save Draft
                </button>
                <button
                  onClick={() => {
                    setShowCreateDraft(false);
                    setNewDraftContent('');
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Drafts List */}
          {drafts.length > 0 ? (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white/5 rounded-xl p-4 border border-transparent hover:border-[#00a884]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm mb-2">{draft.content}</p>
                      <div className="flex items-center gap-2 text-white/40 text-xs">
                        <Clock size={12} />
                        <span>{formatTime(draft.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditDraft(draft)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectDraft(draft)}
                    className="w-full mt-3 px-3 py-2 bg-[#00a884]/20 hover:bg-[#00a884]/30 rounded-lg text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send size={14} />
                    Use This Draft
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>No drafts saved yet</p>
              <p className="text-sm">Create a draft to get started</p>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDraftsPanel;
