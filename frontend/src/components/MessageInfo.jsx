import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Check, CheckCheck, Clock, Eye, Forward, Users, History, X as XIcon, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const MessageInfo = ({ messageId, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const { getMessageInfo } = useChat();

  useEffect(() => {
    if (!messageId) return;
    setLoading(true);
    getMessageInfo(messageId)
      .then(res => { if (res?.success) setInfo(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [messageId]);

  const fmt = (d) => d ? new Date(d).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

  const fetchEditHistory = async () => {
    try {
      const API_URL = resolveApiBase();
      const response = await authFetch(`${API_URL}/chat/messages/${messageId}/edit-history`);
      const data = await response.json();
      if (data.success) {
        setEditHistory(data.editHistory || []);
        setShowEditHistory(true);
      }
    } catch (error) {
      console.error('Failed to fetch edit history:', error);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === 'read') return <CheckCheck size={16} className="text-[#53bdeb]" />;
    if (status === 'delivered') return <CheckCheck size={16} className="text-[#8696a0]" />;
    if (status === 'sent') return <Check size={16} className="text-[#8696a0]" />;
    return <Clock size={16} className="text-[#8696a0]" />;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}>
      <div className="bg-[#111b21] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#2a3942]">
          <h2 className="text-white font-semibold">Message Info</h2>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-[#2a3942] transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !info ? (
            <p className="text-center text-[#8696a0] py-12">Could not load message info</p>
          ) : (
            <>
              {/* Message preview */}
              <div className="mx-4 my-4 bg-[#202c33] rounded-xl p-3 border-l-4 border-[#00a884]">
                <p className="text-white text-sm line-clamp-3">
                  {info.content || `[${info.messageType || 'message'}]`}
                </p>
                <p className="text-[#8696a0] text-xs mt-1">{fmt(info.createdAt)}</p>
              </div>

              {/* Status section */}
              <div className="px-4 pb-2">
                <p className="text-[#8696a0] text-xs font-semibold uppercase tracking-wide mb-2">Status</p>
                <div className="flex items-center gap-3 bg-[#202c33] rounded-xl p-3">
                  <StatusIcon status={info.status} />
                  <span className="text-white text-sm capitalize">{info.status || 'sending'}</span>
                </div>
              </div>

              {/* Read by (group messages) */}
              {info.readBy?.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-[#8696a0] text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Eye size={12} /> Read by ({info.readBy.length})
                  </p>
                  <div className="bg-[#202c33] rounded-xl overflow-hidden">
                    {info.readBy.map((r, i) => (
                      <div key={r.user?._id || i}
                        className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3942] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden">
                            {r.user?.profilePicture
                              ? <img src={r.user.profilePicture} className="w-full h-full object-cover" />
                              : <span className="text-white text-xs font-bold">
                                  {(r.user?.username || r.username || '?').charAt(0).toUpperCase()}
                                </span>}
                          </div>
                          <span className="text-white text-sm">{r.user?.username || r.username || 'User'}</span>
                        </div>
                        <span className="text-[#8696a0] text-xs">{fmt(r.readAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reactions */}
              {info.reactions?.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-[#8696a0] text-xs font-semibold uppercase tracking-wide mb-2">Reactions</p>
                  <div className="bg-[#202c33] rounded-xl overflow-hidden">
                    {info.reactions.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3942] last:border-0">
                        <span className="text-white text-sm">{r.user?.username || r.username || 'User'}</span>
                        <span className="text-2xl">{r.emoji}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forward count */}
              {(info.forwardCount > 0 || info.forwards > 0) && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 text-[#8696a0] text-sm">
                    <Forward size={14} />
                    <span>Forwarded {info.forwardCount || info.forwards} time{(info.forwardCount || info.forwards) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

{/* Edited */}
            {info.isEdited && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-[#8696a0] text-xs">✏️ Edited • {fmt(info.editedAt)}</p>
                  <button
                    onClick={fetchEditHistory}
                    className="flex items-center gap-1 text-[#00a884] text-xs hover:text-[#128c7e] transition-colors"
                  >
                    <History size={12} /> History
                  </button>
                </div>
              </div>
            )}

            {/* Edit History Modal */}
            {showEditHistory && editHistory.length > 0 && (
              <motion.div
                key="edit-history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4"
                onClick={() => setShowEditHistory(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-md shadow-2xl max-h-[70vh] flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3942]">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <History size={20} className="text-[#00a884]" />
                      Edit History
                    </h3>
                    <button onClick={() => setShowEditHistory(false)} className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-[#2a3942] transition-colors" aria-label="Close">
                      <XIcon size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {editHistory.map((edit, index) => (
                      <motion.div
                        key={`${edit._id || index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#202c33] rounded-xl p-3 border border-[#2a3942]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {edit.editedBy && edit.editedBy.profilePicture ? (
                            <img src={edit.editedBy.profilePicture} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884] text-xs font-bold">
                              {edit.editedBy?.username?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-white text-xs font-medium">{edit.editedBy?.username || 'You'}</span>
                          <span className="text-[#8696a0] text-xs ml-auto">
                            {new Date(edit.editedAt).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        {edit.content && (
                          <div className="text-white/80 text-sm bg-[#111b21] rounded-lg p-2 border border-[#2a3942] max-h-32 overflow-y-auto">
                            {edit.content}
                          </div>
                        )}
                        {edit.caption && edit.caption !== edit.content && (
                          <div className="text-white/70 text-sm mt-1 bg-[#111b21] rounded-lg p-2 border border-[#2a3942] border-l-4 border-[#00a884]">
                            <span className="text-[#00a884] text-xs font-medium">Caption: </span>{edit.caption}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-[#2a3942]">
                    <button
                      onClick={() => setShowEditHistory(false)}
                      className="w-full bg-[#00a884] hover:bg-[#008069] text-white font-medium py-2 rounded-xl transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInfo;
