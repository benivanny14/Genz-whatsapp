import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Database, FileText, Image, RefreshCw, Trash2, Video, X } from 'lucide-react';
import { DB } from '../services/db';
import { useChat } from '../context/ChatContext';

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'voice', 'file', 'document', 'gif', 'sticker']);
const LARGE_FILE_SIZE = 5 * 1024 * 1024;

const formatBytes = (bytes = 0) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const getMediaUrl = (message = {}) => (
  message.mediaUrl || message.fileUrl || (
    MEDIA_TYPES.has(message.messageType) && typeof message.content === 'string' ? message.content : ''
  )
);

const isMediaMessage = (message = {}) => (
  MEDIA_TYPES.has(message.messageType) ||
  Boolean(message.mediaUrl || message.fileUrl) ||
  Number(message.fileSize || 0) > 0
);

const getConversationName = (conversation = {}, userId) => {
  if (conversation.isGroup) return conversation.groupName || conversation.name || 'Group chat';
  const other = (conversation.participants || []).find((participant) => (
    String(participant?._id || participant?.id) !== String(userId)
  ));
  return other?.username || other?.name || conversation.name || 'Chat';
};

const iconForType = (type) => {
  if (type === 'image' || type === 'sticker' || type === 'gif') return Image;
  if (type === 'video') return Video;
  if (type === 'file' || type === 'document') return FileText;
  return Archive;
};

const StorageManagement = ({ onClose }) => {
  const { conversations, selectedConversation, messages, setMessages, user } = useChat();
  const [loading, setLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState([]);
  const [summary, setSummary] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState('all');

  const loadStorage = async () => {
    setLoading(true);
    try {
      const cachedConversations = await DB.getConversations().catch(() => []);
      const conversationMap = new Map();
      [...(cachedConversations || []), ...(conversations || [])].forEach((conversation) => {
        if (conversation?._id) conversationMap.set(String(conversation._id), conversation);
      });

      const collected = [];
      for (const conversation of conversationMap.values()) {
        const cachedMessages = await DB.getMessages(conversation._id).catch(() => []);
        const sourceMessages = selectedConversation?._id === conversation._id
          ? [...cachedMessages, ...(messages || [])]
          : cachedMessages;
        const seen = new Set();
        sourceMessages.forEach((message) => {
          const id = String(message?._id || message?.id || '');
          if (!id || seen.has(id) || !isMediaMessage(message)) return;
          seen.add(id);
          collected.push({
            ...message,
            _id: message._id || message.id,
            conversationId: conversation._id,
            conversationName: getConversationName(conversation, user?.id || user?._id),
            mediaUrl: getMediaUrl(message),
            fileSize: Number(message.fileSize || 0)
          });
        });
      }

      const nextSummary = Array.from(
        collected.reduce((map, item) => {
          const current = map.get(item.conversationId) || {
            conversationId: item.conversationId,
            name: item.conversationName,
            totalSize: 0,
            itemCount: 0,
            largeItems: 0
          };
          current.totalSize += item.fileSize;
          current.itemCount += 1;
          if (item.fileSize >= LARGE_FILE_SIZE) current.largeItems += 1;
          map.set(item.conversationId, current);
          return map;
        }, new Map()).values()
      ).sort((a, b) => b.totalSize - a.totalSize);

      setMediaItems(collected.sort((a, b) => Number(b.fileSize || 0) - Number(a.fileSize || 0)));
      setSummary(nextSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, [conversations.length, selectedConversation?._id, messages.length]);

  const totals = useMemo(() => ({
    size: mediaItems.reduce((sum, item) => sum + Number(item.fileSize || 0), 0),
    items: mediaItems.length,
    large: mediaItems.filter((item) => item.fileSize >= LARGE_FILE_SIZE).length
  }), [mediaItems]);

  const visibleItems = selectedChatId === 'all'
    ? mediaItems
    : mediaItems.filter((item) => String(item.conversationId) === String(selectedChatId));

  const deleteItems = async (items) => {
    const ids = items.map((item) => item._id).filter(Boolean);
    if (!ids.length) return;
    await DB.deleteMessages(ids);
    if (selectedConversation && items.some((item) => String(item.conversationId) === String(selectedConversation._id))) {
      setMessages((prev) => prev.filter((message) => !ids.includes(message._id || message.id)));
    }
    await loadStorage();
  };

  const clearConversationMedia = async (conversationId) => {
    const items = mediaItems.filter((item) => String(item.conversationId) === String(conversationId));
    if (!items.length) return;
    if (!confirm(`Clear ${items.length} media item(s) from this chat cache?`)) return;
    await deleteItems(items);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#0d1f35] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-blue-300" size={22} />
            <div>
              <h2 className="text-white text-lg font-bold">Manage Storage</h2>
              <p className="text-blue-200/70 text-xs">Media cache, large files, and per-chat usage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadStorage} className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white" title="Refresh storage" aria-label="Refresh storage">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white" title="Close" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3 border-b border-white/10">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-blue-200 text-xs">Total media</p>
            <p className="text-white font-bold text-xl">{formatBytes(totals.size)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-blue-200 text-xs">Items</p>
            <p className="text-white font-bold text-xl">{totals.items}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-blue-200 text-xs">Large files</p>
            <p className="text-white font-bold text-xl">{totals.large}</p>
          </div>
        </div>

        <div className="flex-1 grid md:grid-cols-[280px_1fr] min-h-0">
          <aside className="border-r border-white/10 overflow-y-auto p-3 space-y-2">
            <button
              type="button"
              onClick={() => setSelectedChatId('all')}
              className={`w-full text-left rounded-xl p-3 ${selectedChatId === 'all' ? 'bg-blue-600/40 text-white' : 'bg-white/5 text-blue-100 hover:bg-white/10'}`}
            >
              <p className="font-semibold">All media</p>
              <p className="text-xs opacity-70">{formatBytes(totals.size)}</p>
            </button>
            {summary.map((chat) => (
              <div key={chat.conversationId} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChatId(chat.conversationId)}
                  className={`flex-1 text-left rounded-xl p-3 ${selectedChatId === chat.conversationId ? 'bg-blue-600/40 text-white' : 'bg-white/5 text-blue-100 hover:bg-white/10'}`}
                >
                  <p className="font-semibold truncate">{chat.name}</p>
                  <p className="text-xs opacity-70">{chat.itemCount} items · {formatBytes(chat.totalSize)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => clearConversationMedia(chat.conversationId)}
                  className="self-stretch px-3 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  title="Clear media from this chat cache" aria-label="Clear media from this chat cache"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </aside>

          <main className="overflow-y-auto p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-blue-100">
                <RefreshCw className="animate-spin mr-2" size={18} />
                Scanning storage...
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-blue-100/70">
                <Database size={42} className="mb-3 opacity-60" />
                <p>No media cache found for this selection.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleItems.map((item) => {
                  const Icon = iconForType(item.messageType);
                  return (
                    <div key={item._id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                        {item.messageType === 'image' && item.mediaUrl ? (
                          <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Icon className="text-blue-200" size={20} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{item.fileName || item.conversationName}</p>
                        <p className="text-blue-200/70 text-xs">
                          {item.messageType || 'media'} · {formatBytes(item.fileSize)} · {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      {item.fileSize >= LARGE_FILE_SIZE && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-200">Large</span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteItems([item])}
                        className="p-2 rounded-lg text-red-300 hover:bg-red-500/15"
                        title="Delete this cached media item" aria-label="Delete this cached media item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default StorageManagement;
