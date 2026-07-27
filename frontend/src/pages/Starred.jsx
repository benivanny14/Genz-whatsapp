import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Search, Star, Trash2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { chatAPI, api } from '../services/api';

const Starred = () => {
  const { conversations, messages, user, toggleStarMessage } = useChat();
  const [search, setSearch] = useState('');
  const [allStarred, setAllStarred] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStarred = async () => {
      setLoading(true);
      try {
        const res = await api.get('/chat/messages/starred');
        const data = res.data;
        setAllStarred(Array.isArray(data) ? data : data?.messages || []);
      } catch (err) {
        console.error('Failed to fetch starred messages', err);
        setAllStarred([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStarred();
  }, [messages]);

  const getMessageText = (message) => {
    if (!message) return '';
    if (typeof message.content === 'string') return message.content;
    return message.message || message.caption || message.messageType || '';
  };

  const getConvName = (convId) => {
    const id = typeof convId === 'object' ? convId?._id : convId;
    const conversation = conversations?.find((conv) => String(conv._id) === String(id));
    if (!conversation) return 'Unknown';
    if (conversation.isGroup) return conversation.groupName || 'Group';

    const currentUserId = user?._id || user?.id;
    const other = conversation.participants?.find(
      (participant) => String(participant?._id || participant) !== String(currentUserId)
    );
    return other?.username || conversation.name || 'Unknown';
  };

  const handleCopy = async (message) => {
    const text = getMessageText(message);
    if (!text) return;
    await navigator.clipboard?.writeText(text);
  };

  const handleUnstar = async (message) => {
    const messageId = message?._id || message?.id;
    if (!messageId) return;

    const result = await toggleStarMessage(messageId, false);
    if (result?.success) {
      setAllStarred((prev) => prev.filter((item) => (item._id || item.id) !== messageId));
    }
  };

  const filtered = allStarred.filter((message) =>
    !search || getMessageText(message).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      <div className="bg-gradient-to-r from-[#1f2c34] to-[#0d1b2a] px-4 py-3 flex items-center gap-3 sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-bold flex items-center gap-2">
            <Star size={18} className="text-yellow-400 fill-yellow-400" /> Ujumbe wa Nyota
          </h1>
          <p className="text-white/40 text-xs">{filtered.length} ujumbe</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search starred messages..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#25d366]/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center">
              <Star size={40} className="text-yellow-400/40" />
            </div>
            <div className="text-center">
              <p className="text-white/50 font-semibold">Hakuna ujumbe wa nyota</p>
              <p className="text-white/30 text-sm mt-1">Bonyeza ujumbe, kisha chagua Star kuuhifadhi</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {filtered.map((message) => {
              const conversationName = getConvName(message.conversationId);
              const messageId = message._id || message.id;

              return (
                <div key={messageId} className="bg-white/5 border border-white/10 rounded-2xl p-4 group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#008069] to-[#25d366] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {(conversationName || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">{conversationName}</p>
                        <p className="text-white/30 text-[10px]">
                          {message.createdAt ? new Date(message.createdAt).toLocaleString('sw-TZ') : '-'}
                        </p>
                      </div>
                    </div>
                    <Star size={14} className="text-yellow-400 fill-yellow-400 shrink-0 mt-1" />
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{getMessageText(message)}</p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleCopy(message)}
                      className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 transition-all"
                    >
                      <Copy size={12} /> Nakili
                    </button>
                    <button
                      onClick={() => handleUnstar(message)}
                      className="flex items-center gap-1 text-xs text-red-400/50 hover:text-red-400 transition-all ml-auto"
                    >
                      <Trash2 size={12} /> Ondoa nyota
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Starred;
