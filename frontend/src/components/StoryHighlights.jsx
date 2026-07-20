import React, { useState, useEffect } from 'react';
import { Plus, X, Star, Trash2, Edit3 } from 'lucide-react';

const HIGHLIGHT_COLORS = [
  'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
  'linear-gradient(45deg,#1cb5e0,#000851)',
  'linear-gradient(45deg,#00b09b,#96c93d)',
  'linear-gradient(45deg,#f7971e,#ffd200)',
  'linear-gradient(45deg,#8e44ad,#3498db)',
  'linear-gradient(45deg,#e74c3c,#c0392b)',
];

const CreateHighlightModal = ({ statuses, newName, setNewName, selectedColor, setSelectedColor, selectedStatuses, toggleStatus, onCreate, onClose, colors }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
    <div className="bg-[#0d1f35] rounded-2xl border border-white/15 w-full max-w-md shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <h3 className="text-white font-bold">Unda Highlight Mpya</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400" aria-label="Close"><X size={18} /></button>
      </div>
      <div className="p-5 space-y-4">
        <input
          type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="Jina la Highlight (mfano: Familia, Safari, Kazi)"
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <div>
          <p className="text-gray-400 text-xs mb-2">Chagua Rangi ya Ring:</p>
          <div className="flex gap-2">
            {colors.map((color, i) => (
              <button key={i} onClick={() => setSelectedColor(i)}
                className={`w-8 h-8 rounded-full border-2 ${selectedColor === i ? 'border-white scale-110' : 'border-transparent'} transition-all`}
                style={{ background: color }} />
            ))}
          </div>
        </div>
        {statuses.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs mb-2">Chagua Statuses ({selectedStatuses.length} selected):</p>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {statuses.map((s) => {
                const sid = s._id || s.id;
                const isSelected = selectedStatuses.some(x => (x._id || x.id) === sid);
                return (
                  <button key={sid} onClick={() => toggleStatus(s)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-500 scale-95' : 'border-transparent'}`}>
                    {s.mediaUrl ? (
                      <img src={s.mediaUrl} alt="status" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/60 p-1"
                        style={{ background: s.backgroundColor || '#008069' }}>
                        {s.content?.slice(0, 20)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-semibold text-sm">Acha</button>
          <button onClick={onCreate} disabled={!newName.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold text-sm disabled:opacity-40">
            Unda Highlight
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ViewHighlightModal = ({ highlight, onClose, onDelete }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
    <div className="bg-[#0d1f35] rounded-2xl border border-white/15 w-full max-w-sm shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="highlight-ring w-10 h-10" style={{ background: highlight.color }}>
            <div className="highlight-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
              {highlight.coverUrl
                ? <img src={highlight.coverUrl} alt={highlight.name} className="w-full h-full object-cover rounded-full" />
                : <Star size={16} className="text-yellow-400" />}
            </div>
          </div>
          <h3 className="text-white font-bold">{highlight.name}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={onDelete} className="p-1 hover:bg-red-500/20 rounded-full text-red-400" aria-label="Delete"><Trash2 size={16} /></button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400" aria-label="Close"><X size={16} /></button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-500 text-xs mb-3">{highlight.statuses?.length || 0} statuses • {new Date(highlight.createdAt).toLocaleDateString()}</p>
        <div className="grid grid-cols-3 gap-2">
          {(highlight.statuses || []).map((s, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
              {s.mediaUrl
                ? <img src={s.mediaUrl} alt="status" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-white/60 p-2 text-center"
                    style={{ background: s.backgroundColor || '#008069' }}>{s.content?.slice(0, 30)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const StoryHighlights = ({ statuses = [], onSaveHighlight, compact = false }) => {
  const [highlights, setHighlights] = useState(() => {
    try { return JSON.parse(localStorage.getItem('genz_highlights') || '[]'); }
    catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [viewHighlight, setViewHighlight] = useState(null);

  const saveHighlights = (updated) => {
    setHighlights(updated);
    localStorage.setItem('genz_highlights', JSON.stringify(updated));
  };

  const createHighlight = () => {
    if (!newName.trim()) return;
    const highlight = {
      id: Date.now(),
      name: newName.trim(),
      color: HIGHLIGHT_COLORS[selectedColor],
      statuses: selectedStatuses,
      coverUrl: selectedStatuses[0]?.mediaUrl || null,
      createdAt: new Date().toISOString(),
    };
    saveHighlights([...highlights, highlight]);
    setNewName('');
    setSelectedStatuses([]);
    setShowCreate(false);
    onSaveHighlight?.(highlight);
  };

  const deleteHighlight = (id) => {
    saveHighlights(highlights.filter(h => h.id !== id));
  };

  const toggleStatus = (status) => {
    setSelectedStatuses(prev =>
      prev.find(s => (s._id || s.id) === (status._id || status.id))
        ? prev.filter(s => (s._id || s.id) !== (status._id || status.id))
        : [...prev, status]
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {/* Add new */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center hover:bg-white/20 transition-all">
            <Plus size={20} className="text-white/60" />
          </div>
          <span className="text-white/50 text-[10px]">New</span>
        </button>

        {/* Existing highlights */}
        {highlights.map((h) => (
          <button
            key={h.id}
            onClick={() => setViewHighlight(h)}
            className="flex-shrink-0 flex flex-col items-center gap-1 group"
          >
            <div className="highlight-ring w-14 h-14" style={{ background: h.color }}>
              <div className="highlight-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
                {h.coverUrl ? (
                  <img src={h.coverUrl} alt={h.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Star size={20} className="text-yellow-400" />
                )}
              </div>
            </div>
            <span className="text-white/70 text-[10px] max-w-[56px] truncate">{h.name}</span>
          </button>
        ))}

        {/* Create modal */}
        {showCreate && (
          <CreateHighlightModal
            statuses={statuses}
            newName={newName}
            setNewName={setNewName}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            selectedStatuses={selectedStatuses}
            toggleStatus={toggleStatus}
            onCreate={createHighlight}
            onClose={() => setShowCreate(false)}
            colors={HIGHLIGHT_COLORS}
          />
        )}

        {/* View highlight modal */}
        {viewHighlight && (
          <ViewHighlightModal
            highlight={viewHighlight}
            onClose={() => setViewHighlight(null)}
            onDelete={() => { deleteHighlight(viewHighlight.id); setViewHighlight(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2"><Star size={18} className="text-yellow-400" /> Story Highlights</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300">
          <Plus size={16} /> New
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {highlights.map((h) => (
          <div key={h.id} className="flex flex-col items-center gap-1 group relative">
            <button onClick={() => setViewHighlight(h)} className="highlight-ring w-16 h-16" style={{ background: h.color }}>
              <div className="highlight-ring-inner w-full h-full flex items-center justify-center overflow-hidden">
                {h.coverUrl ? (
                  <img src={h.coverUrl} alt={h.name} className="w-full h-full object-cover rounded-full" />
                ) : <Star size={22} className="text-yellow-400" />}
              </div>
            </button>
            <span className="text-white/70 text-[10px] truncate w-16 text-center">{h.name}</span>
            <button
              onClick={() => deleteHighlight(h.id)}
              className="absolute -top-1 -right-1 bg-red-500 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
             aria-label="Close">
              <X size={10} className="text-white" />
            </button>
          </div>
        ))}
        <button onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/10 transition-all">
            <Plus size={20} className="text-white/40" />
          </div>
          <span className="text-white/40 text-[10px]">New</span>
        </button>
      </div>
      {showCreate && (
        <CreateHighlightModal
          statuses={statuses} newName={newName} setNewName={setNewName}
          selectedColor={selectedColor} setSelectedColor={setSelectedColor}
          selectedStatuses={selectedStatuses} toggleStatus={toggleStatus}
          onCreate={createHighlight} onClose={() => setShowCreate(false)} colors={HIGHLIGHT_COLORS}
        />
      )}
      {viewHighlight && (
        <ViewHighlightModal highlight={viewHighlight} onClose={() => setViewHighlight(null)}
          onDelete={() => { deleteHighlight(viewHighlight.id); setViewHighlight(null); }} />
      )}
    </div>
  );
};


export default StoryHighlights;
