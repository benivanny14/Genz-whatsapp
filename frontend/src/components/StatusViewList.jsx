import React from 'react';
import { X, Eye, Clock, UserCheck } from 'lucide-react';

const StatusViewList = ({ viewers = [], onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-80 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Eye size={18} className="text-[#00a884]" /> Views ({viewers.length})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {viewers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <UserCheck size={32} className="mx-auto mb-2 opacity-40" />
            No one has viewed this status yet
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {viewers.map((viewer, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00a884] to-[#008069] flex items-center justify-center text-white font-bold text-sm">
                    {(viewer.username || viewer.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{viewer.username || viewer.name || 'Unknown'}</p>
                    {viewer.phoneNumber && <p className="text-gray-500 text-xs">{viewer.phoneNumber}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <Clock size={12} />
                  <span>{viewer.viewedAt ? new Date(viewer.viewedAt).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewList;
