import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Phone, Video, PhoneIncoming, PhoneMissed, PhoneOutgoing, Search, ArrowLeft, Timer, UserPlus, X, Trash2, CheckSquare, Square, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import callService from '../services/callService';
import CallLinkModal from '../components/CallLinkModal';

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
};

const Calls = () => {
  const {
    callLogs,
    fetchCallLogs,
    conversations,
    initiateCall,
    selectConversation
  } = useChat();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNewCall, setShowNewCall] = useState(false);
  const [showCallLink, setShowCallLink] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // FEATURE ADD: multi-select delete for call logs, WhatsApp-style
  // (long-press or "Select" a row to enter select mode, tap more, then
  // delete them all at once instead of one at a time).
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      await Promise.allSettled(selectedIds.map((id) => callService.deleteCallLog(id)));
    } finally {
      setDeleting(false);
      setSelectMode(false);
      setSelectedIds([]);
      fetchCallLogs?.();
    }
  };

  useEffect(() => {
    fetchCallLogs?.();
  }, [fetchCallLogs]);

  const allLogs = callLogs || [];
  const filtered = allLogs.filter((c) => {
    const matchSearch = !search || c.callerName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'missed' && c.missed) ||
      (filter === 'voice' && (c.callType === 'voice' || c.callType === 'audio')) ||
      (filter === 'video' && c.callType === 'video');
    return matchSearch && matchFilter;
  });

  const dialTargets = (conversations || []).filter((conv) => {
    if (conv.isGroup) return false;
    const name = conv.name || conv.participants?.find((p) => p.username)?.username || '';
    return !contactSearch || name.toLowerCase().includes(contactSearch.toLowerCase());
  });

  const handleCallBack = (log, type) => {
    const conv = conversations?.find(
      (c) => c._id === log.conversationId || c.name === log.callerName
    );
    if (conv) {
      selectConversation(conv);
      initiateCall(type || log.callType || 'voice', conv);
      navigate('/chat');
    } else {
      setShowNewCall(true);
    }
  };

  const startCallFromList = (conv, type) => {
    selectConversation(conv);
    initiateCall(type, conv);
    setShowNewCall(false);
    navigate('/chat');
  };

  const CallIcon = ({ log }) => {
    if (log.missed) return <PhoneMissed size={16} className="text-red-400" />;
    if (log.type === 'incoming') return <PhoneIncoming size={16} className="text-green-400" />;
    return <PhoneOutgoing size={16} className="text-blue-400" />;
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      <div className="bg-gradient-to-r from-[#1f2c34] to-[#0d1b2a] px-4 py-3 flex items-center gap-3 sticky top-0 z-50 border-b border-white/5">
        {selectMode ? (
          <>
            <button type="button" onClick={toggleSelectMode} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70" aria-label="Ghairi">
              <X size={20} />
            </button>
            <div className="flex-1">
              <p className="text-white font-bold">{selectedIds.length} zimechaguliwa</p>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || deleting}
              className="p-2 rounded-xl hover:bg-red-500/20 transition-all text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Futa zilizochaguliwa" aria-label="Futa zilizochaguliwa"
            >
              <Trash2 size={20} />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-white font-bold flex items-center gap-2">
                <Phone size={18} className="text-green-400" /> Simu
              </h1>
              <p className="text-white/40 text-xs">{filtered.length} kumbukumbu</p>
            </div>
            {allLogs.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectMode}
                className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70"
                title="Chagua" aria-label="Chagua"
              >
                <CheckSquare size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowNewCall(true)}
              className="p-2 bg-[#008069] hover:bg-[#007a5e] rounded-xl transition-all text-white"
              title="Piga simu mpya" aria-label="Piga simu mpya"
            >
              <Phone size={18} />
            </button>
          </>
        )}
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search calls..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#25d366]/40"
          />
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All' },
          { id: 'missed', label: '🔴 Missed' },
          { id: 'voice', label: '🎙️ Voice' },
          { id: 'video', label: '📹 Video' }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.id ? 'bg-[#008069] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCallLink(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all bg-white/5 text-[#25d366] hover:bg-white/10 flex items-center gap-1 shrink-0"
        >
          <Link2 size={13} /> Call Link
        </button>
      </div>

      {showCallLink && (
        <CallLinkModal onClose={() => setShowCallLink(false)} />
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 bg-green-400/10 rounded-full flex items-center justify-center">
              <Phone size={40} className="text-green-400/40" />
            </div>
            <p className="text-white/40 font-semibold text-center">
              Hakuna simu bado
            </p>
            <p className="text-white/25 text-sm text-center max-w-xs">
              Piga simu kutoka mazungumzo yako au bonyeza kitufe cha simu hapo juu
            </p>
            <button
              type="button"
              onClick={() => setShowNewCall(true)}
              className="mt-2 px-5 py-2.5 bg-[#008069] text-white rounded-xl text-sm font-semibold flex items-center gap-2"
            >
              <UserPlus size={16} /> Piga simu mpya
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <div
                key={log._id}
                onClick={() => selectMode && toggleSelected(log._id)}
                onContextMenu={(e) => {
                  if (!selectMode) {
                    e.preventDefault();
                    setSelectMode(true);
                    setSelectedIds([log._id]);
                  }
                }}
                className={`bg-white/5 hover:bg-white/10 border rounded-2xl p-4 flex items-center gap-3 transition-all group ${
                  selectMode && selectedIds.includes(log._id)
                    ? 'border-[#25d366]/60 bg-[#25d366]/10'
                    : 'border-white/10'
                } ${selectMode ? 'cursor-pointer' : ''}`}
              >
                {selectMode && (
                  <div className="shrink-0 text-[#25d366]">
                    {selectedIds.includes(log._id) ? <CheckSquare size={20} /> : <Square size={20} className="text-white/30" />}
                  </div>
                )}
                <div className="w-11 h-11 bg-gradient-to-br from-[#008069] to-[#25d366] rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  {log.isGroup ? '👥' : (log.callerName || 'U')[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${log.missed ? 'text-red-400' : 'text-white'}`}>
                    {log.callerName || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CallIcon log={log} />
                    <span className="text-white/40 text-xs capitalize">
                      {log.callType === 'video' ? '📹 Video' : '🎙️ Sauti'}
                    </span>
                    {log.missed && <span className="text-red-400/70 text-xs">• Haikupokelewa</span>}
                    {log.duration > 0 && (
                      <span className="text-white/30 text-xs">• {formatDuration(log.duration)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-white/25 text-xs flex items-center gap-1">
                    <Timer size={10} />
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString('sw-TZ', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </span>
                  {!selectMode && (
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                      <button
                        type="button"
                        onClick={() => handleCallBack(log, 'voice')}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/20"
                        title="Piga simu ya sauti" aria-label="Piga simu ya sauti"
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCallBack(log, 'video')}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/20"
                        title="Piga video simu" aria-label="Piga video simu"
                      >
                        <Video size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCall && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1f2c34] border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold">New Call</h2>
              <button type="button" onClick={() => setShowNewCall(false)} className="p-2 text-white/50 hover:text-white" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search person..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#25d366]/40"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {dialTargets.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">
                  No conversations. Start a chat first from the conversations page.
                </p>
              ) : (
                dialTargets.map((conv) => {
                  const name =
                    conv.name ||
                    conv.participants?.find((p) => p.username)?.username ||
                    'Mtu';
                  return (
                    <div
                      key={conv._id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#008069] flex items-center justify-center text-white font-bold">
                        {name[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-white text-sm font-medium truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => startCallFromList(conv, 'voice')}
                        className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg"
                       aria-label="Call">
                        <Phone size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startCallFromList(conv, 'video')}
                        className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg"
                       aria-label="Video call">
                        <Video size={18} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calls;
