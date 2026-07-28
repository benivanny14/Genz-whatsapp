import React, { useState } from 'react';
import { X, Type, ArrowUp, RefreshCw, Search, Clock, Filter, ChevronDown } from 'lucide-react';

const ChatFeaturesPanel = ({ onClose, onSave }) => {
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [scrollToTopFAB, setScrollToTopFAB] = useState(true);
  const [pullToRefresh, setPullToRefresh] = useState(true);
  const [fastScroll, setFastScroll] = useState(true);
  const [recentSearches, setRecentSearches] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    images: true,
    videos: true,
    links: true,
    audio: true,
    documents: true
  });

  const handleSave = () => {
    if (onSave) {
      onSave({
        typingIndicator,
        scrollToTopFAB,
        pullToRefresh,
        fastScroll,
        recentSearches,
        searchFilters
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Type className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Chat Features</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Typing Indicator */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Typing Indicator</p>
                  <p className="text-white/50 text-sm">Show when someone is typing</p>
                </div>
              </div>
              <button
                onClick={() => setTypingIndicator(!typingIndicator)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  typingIndicator ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    typingIndicator ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Scroll to Top FAB */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUp size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Scroll to Top FAB</p>
                  <p className="text-white/50 text-sm">Show floating button to scroll up</p>
                </div>
              </div>
              <button
                onClick={() => setScrollToTopFAB(!scrollToTopFAB)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  scrollToTopFAB ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    scrollToTopFAB ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Pull to Refresh */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Pull to Refresh</p>
                  <p className="text-white/50 text-sm">Refresh chats by pulling down</p>
                </div>
              </div>
              <button
                onClick={() => setPullToRefresh(!pullToRefresh)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  pullToRefresh ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    pullToRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Fast Scroll */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Fast Scroll</p>
                  <p className="text-white/50 text-sm">Enable fast scrolling in chat list</p>
                </div>
              </div>
              <button
                onClick={() => setFastScroll(!fastScroll)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  fastScroll ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    fastScroll ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Recent Searches */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#00a884]" />
                <div>
                  <p className="text-white font-medium">Recent Searches</p>
                  <p className="text-white/50 text-sm">Show recent search history</p>
                </div>
              </div>
              <button
                onClick={() => setRecentSearches(!recentSearches)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  recentSearches ? 'bg-[#00a884]' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    recentSearches ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Search Filters */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Search Filters</h3>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-white/70">Images</span>
                <input
                  type="checkbox"
                  checked={searchFilters.images}
                  onChange={(e) => setSearchFilters({ ...searchFilters, images: e.target.checked })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white/70">Videos</span>
                <input
                  type="checkbox"
                  checked={searchFilters.videos}
                  onChange={(e) => setSearchFilters({ ...searchFilters, videos: e.target.checked })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white/70">Links</span>
                <input
                  type="checkbox"
                  checked={searchFilters.links}
                  onChange={(e) => setSearchFilters({ ...searchFilters, links: e.target.checked })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white/70">Audio</span>
                <input
                  type="checkbox"
                  checked={searchFilters.audio}
                  onChange={(e) => setSearchFilters({ ...searchFilters, audio: e.target.checked })}
                  className="rounded"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-white/70">Documents</span>
                <input
                  type="checkbox"
                  checked={searchFilters.documents}
                  onChange={(e) => setSearchFilters({ ...searchFilters, documents: e.target.checked })}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Chat Features
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatFeaturesPanel;
