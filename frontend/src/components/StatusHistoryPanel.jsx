import React, { useState, useEffect } from 'react';
import { X, History, Clock, Calendar, BarChart3, Eye, Download, Filter, Search } from 'lucide-react';

const StatusHistoryPanel = ({ onClose, status }) => {
  const [history, setHistory] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      // Fallback to localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('genz_status_history') || '[]');
        setHistory(saved);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayHistory = history.length > 0 ? history : [];

  const filteredHistory = displayHistory.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = (item.content || item.caption || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(displayHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'status-history.json';
    link.click();
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.setItem('genz_status_history', JSON.stringify([]));
    }
  };

  const typeIcons = {
    text: '📝',
    image: '🖼️',
    video: '🎬',
    poll: '📊',
    music: '🎵',
    location: '📍',
    link: '🔗'
  };

  const typeColors = {
    text: 'bg-blue-500/20 text-blue-400',
    image: 'bg-green-500/20 text-green-400',
    video: 'bg-purple-500/20 text-purple-400',
    poll: 'bg-yellow-500/20 text-yellow-400',
    music: 'bg-pink-500/20 text-pink-400',
    location: 'bg-orange-500/20 text-orange-400',
    link: 'bg-cyan-500/20 text-cyan-400'
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalViews = displayHistory.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalReactions = displayHistory.reduce((sum, item) => sum + (item.reactions || 0), 0);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <History className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status History</h2>
              <p className="text-white/60 text-xs">{displayHistory.length} statuses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportHistory}
              className="text-[#00a884] hover:text-[#008f6f] text-sm flex items-center gap-1"
            >
              <Download size={16} />
              Export
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} className="text-[#00a884]" />
                <span className="text-white/60 text-xs">Total Views</span>
              </div>
              <p className="text-white text-xl font-bold">{totalViews}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-[#00a884]" />
                <span className="text-white/60 text-xs">Total Reactions</span>
              </div>
              <p className="text-white text-xl font-bold">{totalReactions}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-white/60" />
            <div className="flex flex-wrap gap-2">
              {['all', 'text', 'image', 'video', 'poll', 'music', 'location'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                    filterType === type
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* History List */}
          <div className="space-y-2">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-transparent hover:border-[#00a884]/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${typeColors[item.type] || 'bg-white/10 text-white'}`}>
                  {typeIcons[item.type] || '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.content}</p>
                  <div className="flex items-center gap-3 text-white/40 text-xs mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{item.views}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[#00a884] text-sm">
                    <BarChart3 size={14} />
                    <span>{item.reactions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <History size={48} className="mx-auto mb-2 opacity-50" />
              <p>No history found</p>
            </div>
          )}

          {/* Clear History */}
          {displayHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm"
            >
              Clear All History
            </button>
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

export default StatusHistoryPanel;
