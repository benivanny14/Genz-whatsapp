import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Archive, Calendar, Search, Filter, Download, Trash2, Eye, Clock, Tag } from 'lucide-react';

const StatusArchivePanel = ({ onClose, onArchiveAction }) => {
  const [archivedStatuses, setArchivedStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArchivedStatuses();
  }, []);

  const loadArchivedStatuses = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/archived`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setArchivedStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error('Error loading archived statuses:', error);
      // Fallback to localStorage
      try {
        const archived = JSON.parse(localStorage.getItem('genz_archived_statuses') || '[]');
        setArchivedStatuses(archived);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (statusId) => {
    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status/${statusId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadArchivedStatuses();
    } catch (error) {
      console.error('Error deleting archived status:', error);
      // Fallback to localStorage
      const updated = archivedStatuses.filter(s => s._id !== statusId);
      setArchivedStatuses(updated);
      localStorage.setItem('genz_archived_statuses', JSON.stringify(updated));
    }
  };

  const handleRestore = async (statusId) => {
    try {
      const token = getAuthToken();
      await fetch(`${resolveApiBase()}/status-advanced/${statusId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isArchived: false })
      });
      await loadArchivedStatuses();
    } catch (error) {
      console.error('Error restoring status:', error);
      // Fallback
      const status = archivedStatuses.find(s => s._id === statusId);
      if (status && onArchiveAction) {
        onArchiveAction({ action: 'restore', status });
      }
      handleDelete(statusId);
    }
  };

  const handleBulkDelete = () => {
    const updated = archivedStatuses.filter(s => !selectedStatuses.includes(s.id));
    setArchivedStatuses(updated);
    localStorage.setItem('genz_archived_statuses', JSON.stringify(updated));
    setSelectedStatuses([]);
  };

  const handleBulkRestore = () => {
    selectedStatuses.forEach(id => {
      const status = archivedStatuses.find(s => s.id === id);
      if (status && onArchiveAction) {
        onArchiveAction({ action: 'restore', status });
      }
    });
    handleBulkDelete();
  };

  const filteredStatuses = archivedStatuses.filter(status => {
    const matchesSearch = status.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         status.caption?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || status.type === filterType;
    const matchesDate = filterDate === 'all' || checkDateFilter(status.archivedAt, filterDate);
    return matchesSearch && matchesType && matchesDate;
  });

  const checkDateFilter = (archivedAt, filter) => {
    if (!archivedAt) return true;
    const date = new Date(archivedAt);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    switch (filter) {
      case 'today': return daysDiff === 0;
      case 'week': return daysDiff <= 7;
      case 'month': return daysDiff <= 30;
      default: return true;
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Archive className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Archive</h2>
              <p className="text-white/60 text-xs">{archivedStatuses.length} archived statuses</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archived statuses..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 bg-white/10 text-white px-4 py-2 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              <option value="all" className="bg-[#1a2e35]">All Types</option>
              <option value="image" className="bg-[#1a2e35]">Images</option>
              <option value="video" className="bg-[#1a2e35]">Videos</option>
              <option value="text" className="bg-[#1a2e35]">Text</option>
            </select>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex-1 bg-white/10 text-white px-4 py-2 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              <option value="all" className="bg-[#1a2e35]">All Time</option>
              <option value="today" className="bg-[#1a2e35]">Today</option>
              <option value="week" className="bg-[#1a2e35]">This Week</option>
              <option value="month" className="bg-[#1a2e35]">This Month</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedStatuses.length > 0 && (
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleBulkRestore}
              className="flex-1 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white text-sm font-medium"
            >
              Restore ({selectedStatuses.length})
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white text-sm font-medium"
            >
              Delete ({selectedStatuses.length})
            </button>
          </div>
        )}

        {/* Archived Statuses List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredStatuses.length === 0 ? (
            <div className="text-center text-white/40 py-12">
              <Archive size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No archived statuses found</p>
              <p className="text-sm">Archive statuses to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredStatuses.map((status) => (
                <div
                  key={status.id}
                  className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors group"
                >
                  <div className="aspect-square bg-black/50 relative">
                    {status.mediaUrl ? (
                      <img
                        src={status.mediaUrl}
                        alt={status.content}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/40">
                        <Archive size={32} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status.id]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(id => id !== status.id));
                          }
                        }}
                        className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm truncate mb-1">{status.content || status.caption || 'No content'}</p>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span className="capitalize">{status.type}</span>
                      <span>{new Date(status.archivedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(status.id)}
                        className="flex-1 px-2 py-1 bg-[#00a884]/20 hover:bg-[#00a884]/30 rounded text-[#00a884] text-xs"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(status.id)}
                        className="flex-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <div className="flex items-center justify-between text-white/60 text-sm">
            <span>{filteredStatuses.length} archived</span>
            <span>{selectedStatuses.length} selected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusArchivePanel;
