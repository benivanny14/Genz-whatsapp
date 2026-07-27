import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Archive, ArrowLeft, Search, MessageCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const Archived = () => {
  const { selectConversation } = useChat();
  const [search, setSearch] = useState('');
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArchived = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const res = await fetch(`${API_URL}/chat/conversations/archived`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setArchivedConversations(data.conversations || []);
        }
      } catch (err) {
        console.error('Failed to fetch archived conversations', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArchived();
  }, []);

  const filtered = archivedConversations.filter(c =>
    !search || (c.name || c.groupName || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpen = (conv) => {
    selectConversation(conv);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1f2c34] to-[#0d1b2a] px-4 py-3 flex items-center gap-3 sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-bold flex items-center gap-2">
            <Archive size={18} className="text-blue-400" /> Archived Conversations
          </h1>
          <p className="text-white/40 text-xs">{filtered.length} conversations</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#25d366]/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-blue-400/10 rounded-full flex items-center justify-center">
              <Archive size={40} className="text-blue-400/40" />
            </div>
            <div className="text-center">
              <p className="text-white/50 font-semibold">Hakuna mazungumzo yaliyohifadhiwa</p>
              <p className="text-white/30 text-sm mt-1">Swipe mazungumzo kushoto kwenye chat list, kisha hifadhi</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {filtered.map(conv => (
              <div key={conv._id} onClick={() => handleOpen(conv)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all group">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {conv.isGroup ? '👥' : (conv.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{conv.name || conv.groupName || 'Unknown'}</p>
                  <p className="text-white/40 text-sm truncate mt-0.5">{conv.lastMessage?.content || '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-white/25 text-xs">
                    {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString('sw-TZ') : ''}
                  </p>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archived;
