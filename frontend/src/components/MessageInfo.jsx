import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { X, Check, CheckCheck, Clock, Eye, Forward, Users } from 'lucide-react';

const MessageInfo = ({ messageId, onClose }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
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
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-[#2a3942] transition-colors">
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

              {/* Delivered to */}
              {info.deliveredTo?.length > 0 && (
                <div className="px-4 pb-2">
                  <p className="text-[#8696a0] text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                    <CheckCheck size={12} /> Delivered to ({info.deliveredTo.length})
                  </p>
                  <div className="bg-[#202c33] rounded-xl overflow-hidden">
                    {info.deliveredTo.map((d, i) => (
                      <div key={d.user?._id || i}
                        className="flex items-center justify-between px-3 py-2.5 border-b border-[#2a3942] last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {(d.user?.username || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white text-sm">{d.user?.username || 'User'}</span>
                        </div>
                        <span className="text-[#8696a0] text-xs">{fmt(d.deliveredAt)}</span>
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
                  <p className="text-[#8696a0] text-xs">✏️ Edited • {fmt(info.editedAt)}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInfo;
