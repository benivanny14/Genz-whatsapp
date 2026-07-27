import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Search as FiSearch, X as FiX } from 'lucide-react';

const SearchMessages = ({ conversationId, onSelectMessage, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { searchMessages } = useChat();

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await searchMessages(conversationId, query);
        if (response.success) {
          setResults(response.data || []);
        } else {
          setError(response.message || 'Search failed');
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search messages');
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [query, conversationId, searchMessages]);

  const handleResultClick = (message) => {
    if (onSelectMessage) {
      onSelectMessage(message);
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="bg-[#0d1b2a] w-full rounded-t-2xl p-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Search Messages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full"
          >
            <FiX size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 mb-4">
          <FiSearch size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent flex-1 text-white placeholder-gray-500 outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-white"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && results.length === 0 && query.trim() !== '' && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No messages found
            </div>
          )}

          {results.map((msg) => (
            (() => {
              const sender = msg.senderInfo || msg.sender || {};
              return (
            <button
              key={msg._id}
              onClick={() => handleResultClick(msg)}
              className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 transition"
            >
              <div className="flex items-start gap-3">
                {/* Sender Avatar */}
                <img
                  src={sender.profilePicture || 'https://via.placeholder.com/40'}
                  alt={sender.username || 'Sender'}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-semibold text-white text-sm">
                      {sender.username || 'Unknown'}
                    </p>
                    <p className="text-gray-400 text-xs flex-shrink-0">
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Message Preview */}
                  <p className="text-gray-300 text-sm truncate mt-1">
                    {msg.messageType === 'text' ? msg.content : `📎 ${msg.messageType}`}
                  </p>
                </div>
              </div>
            </button>
              );
            })()
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="text-center py-2 text-gray-400 text-xs border-t border-gray-700 mt-2">
            Found {results.length} message{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchMessages;
