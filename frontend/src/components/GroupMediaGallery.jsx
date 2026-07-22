import React, { useState, useMemo } from 'react';
import { X, Image, Video, Music, FileText, Download, Search, Grid, List } from 'lucide-react';

const GroupMediaGallery = ({ messages = [], onClose }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');

  const mediaItems = useMemo(() => {
    return (messages || []).filter(msg => {
      if (msg.messageType === 'system' || msg.deletedForEveryone) return false;
      
      // Filter by media type
      if (filter === 'image' && msg.messageType !== 'image') return false;
      if (filter === 'video' && msg.messageType !== 'video') return false;
      if (filter === 'audio' && msg.messageType !== 'audio') return false;
      if (filter === 'document' && !['document', 'file', 'application'].some(t => (msg.messageType || '').includes(t))) return false;
      
      // Search by caption/content
      if (search) {
        const content = (msg.content || msg.caption || '').toLowerCase();
        if (!content.includes(search.toLowerCase())) return false;
      }
      
      return msg.mediaUrl || msg.fileUrl;
    }).map(msg => ({
      id: msg._id || msg.id,
      type: msg.messageType || 'image',
      url: msg.mediaUrl || msg.fileUrl,
      caption: msg.content || msg.caption || '',
      sender: msg.sender?.username || 'Unknown',
      date: msg.createdAt,
      fileName: msg.fileName || '',
      fileSize: msg.fileSize || 0,
    }));
  }, [messages, filter, search]);

  const filteredCounts = useMemo(() => ({
    all: (messages || []).filter(m => m.mediaUrl || m.fileUrl).length,
    image: (messages || []).filter(m => m.messageType === 'image').length,
    video: (messages || []).filter(m => m.messageType === 'video').length,
    audio: (messages || []).filter(m => m.messageType === 'audio').length,
    document: (messages || []).filter(m => ['document', 'file'].includes(m.messageType)).length,
  }), [messages]);

  const FILTERS = [
    { id: 'all', label: 'All', icon: Grid, count: filteredCounts.all },
    { id: 'image', label: 'Photos', icon: Image, count: filteredCounts.image },
    { id: 'video', label: 'Videos', icon: Video, count: filteredCounts.video },
    { id: 'audio', label: 'Audio', icon: Music, count: filteredCounts.audio },
    { id: 'document', label: 'Docs', icon: FileText, count: filteredCounts.document },
  ];

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Image size={18} className="text-[#00a884]" /> Media Gallery
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
              {view === 'grid' ? <List size={16} /> : <Grid size={16} />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 bg-[#0b141a] rounded-lg px-3 py-2 border border-white/10">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search media..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-[#00a884] text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              <f.icon size={12} />
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Media Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Image size={48} className="opacity-30 mb-3" />
              <p className="text-sm">No media found</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group relative hover:border-[#00a884] transition-colors"
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover" loading="lazy" />
                  ) : item.type === 'video' ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <Video size={32} className="text-white/50" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                  )}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[10px] truncate">{item.caption}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {mediaItems.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    {item.type === 'image' ? <Image size={18} className="text-blue-400" /> :
                     item.type === 'video' ? <Video size={18} className="text-purple-400" /> :
                     item.type === 'audio' ? <Music size={18} className="text-green-400" /> :
                     <FileText size={18} className="text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.caption || item.fileName || item.type}</p>
                    <p className="text-gray-500 text-xs">{item.sender} · {formatSize(item.fileSize)}</p>
                  </div>
                  <Download size={14} className="text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupMediaGallery;
