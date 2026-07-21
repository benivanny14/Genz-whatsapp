import React, { useState, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Download, Image as ImageIcon, Film, Music, FileText, Link, File } from 'lucide-react';

const MEDIA_TYPES = {
  media: { label: 'Media', icon: ImageIcon, types: ['image', 'video', 'gif'] },
  docs: { label: 'Docs', icon: FileText, types: ['document', 'file'] },
  links: { label: 'Links', icon: Link, types: ['link'] },
  audio: { label: 'Audio', icon: Music, types: ['audio', 'voice'] },
};

const isLink = (msg) => {
  if (msg.messageType === 'link') return true;
  if (msg.messageType === 'text' && msg.content) {
    return /https?:\/\/[^\s]+/.test(msg.content);
  }
  return false;
};

const getMediaUrl = (msg) => msg.mediaUrl || msg.content || msg.url || '';

const MediaGallery = ({ conversationId, onClose }) => {
  const { messages, selectedConversation } = useChat();
  const [activeTab, setActiveTab] = useState('media');
  const [selectedItem, setSelectedItem] = useState(null);

  const convId = conversationId || selectedConversation?._id;

  // Filter messages for this conversation from context (local state)
  const convMessages = useMemo(() => {
    if (!convId) return messages || [];
    return (messages || []).filter(m =>
      String(m.conversationId || m.conversation || selectedConversation?._id) === String(convId) ||
      !m.conversationId
    );
  }, [messages, convId, selectedConversation]);

  // Categorize messages
  const categorized = useMemo(() => {
    const result = { media: [], docs: [], links: [], audio: [] };
    convMessages.forEach(msg => {
      const type = msg.messageType || 'text';
      const url = getMediaUrl(msg);
      if (!url && type === 'text' && !isLink(msg)) return;

      if (isLink(msg)) {
        const urlMatch = (msg.content || '').match(/https?:\/\/[^\s]+/);
        if (urlMatch) result.links.push({ ...msg, _extractedLink: urlMatch[0] });
      } else if (['image', 'video', 'gif'].includes(type)) {
        if (url) result.media.push(msg);
      } else if (['document', 'file'].includes(type)) {
        if (url) result.docs.push(msg);
      } else if (['audio', 'voice'].includes(type)) {
        if (url) result.audio.push(msg);
      }
    });
    return result;
  }, [convMessages]);

  const currentItems = categorized[activeTab] || [];
  const tabs = [
    { id: 'media', label: 'Media', icon: ImageIcon, count: categorized.media.length },
    { id: 'docs', label: 'Docs', icon: FileText, count: categorized.docs.length },
    { id: 'links', label: 'Links', icon: Link, count: categorized.links.length },
    { id: 'audio', label: 'Audio', icon: Music, count: categorized.audio.length },
  ];

  return (
    <div className="fixed inset-0 z-[9000] bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#111b21] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Media, Links and Docs</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Close">
            <X size={20} className="text-white/70" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors relative ${activeTab === tab.id ? 'text-[#00a884]' : 'text-white/40 hover:text-white/70'
                }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] ${activeTab === tab.id ? 'text-[#00a884]' : 'text-white/30'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a884] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                {(() => { const T = tabs.find(t => t.id === activeTab); return T ? <T.icon size={28} className="text-white/20" /> : null; })()}
              </div>
              <p className="text-white/30 text-sm">No {tabs.find(t => t.id === activeTab)?.label?.toLowerCase()} shared yet</p>
            </div>
          ) : activeTab === 'media' ? (
            /* Photo/Video Grid */
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {currentItems.map((item, i) => {
                const url = getMediaUrl(item);
                const isVideo = item.messageType === 'video';
                return (
                  <button
                    key={item._id || i}
                    onClick={() => setSelectedItem(item)}
                    className="relative aspect-square bg-white/5 overflow-hidden group"
                  >
                    <img
                      src={url}
                      alt={item.fileName || 'media'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={e => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-white/10'); }}
                    />
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Film size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : activeTab === 'docs' ? (
            <div className="p-3 flex flex-col gap-2">
              {currentItems.map((item, i) => {
                const url = getMediaUrl(item);
                const name = item.fileName || url.split('/').pop() || 'Document';
                const size = item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : '';
                return (
                  <a
                    key={item._id || i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-[#00a884]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{name}</p>
                      {size && <p className="text-white/40 text-xs">{size}</p>}
                    </div>
                    <Download size={16} className="text-white/30 group-hover:text-white/70 transition-colors flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          ) : activeTab === 'links' ? (
            <div className="p-3 flex flex-col gap-2">
              {currentItems.map((item, i) => {
                const link = item._extractedLink || getMediaUrl(item);
                return (
                  <a
                    key={item._id || i}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Link size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-blue-400 text-sm truncate">{link}</p>
                      {item.content && item.content !== link && (
                        <p className="text-white/40 text-xs truncate mt-0.5">{item.content}</p>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : activeTab === 'audio' ? (
            <div className="p-3 flex flex-col gap-2">
              {currentItems.map((item, i) => {
                const url = getMediaUrl(item);
                const isVoice = item.messageType === 'voice';
                const dur = typeof item.duration === 'number' ? `${Math.round(item.duration)}s` : '';
                return (
                  <div key={item._id || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Music size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{isVoice ? 'Voice Note' : (item.fileName || 'Audio')}</p>
                      {dur && <p className="text-white/40 text-xs">{dur}</p>}
                      <audio src={url} controls className="mt-1 w-full h-8" style={{ height: '32px' }} />
                    </div>
                    <a href={url} download className="flex-shrink-0">
                      <Download size={16} className="text-white/30 hover:text-white/70 transition-colors" />
                    </a>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Fullscreen viewer */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[9100] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setSelectedItem(null)}
           aria-label="Close">
            <X size={22} className="text-white" />
          </button>
          <a
            href={getMediaUrl(selectedItem)}
            download
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Download size={22} className="text-white" />
          </a>
          <div onClick={e => e.stopPropagation()}>
            {selectedItem.messageType === 'video' ? (
              <video
                src={getMediaUrl(selectedItem)}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] rounded-lg"
              />
            ) : (
              <img
                src={getMediaUrl(selectedItem)}
                alt="media"
                className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
