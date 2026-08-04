import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Copy, CheckCircle, Clock, Calendar } from 'lucide-react';

const StatusDuplicatePanel = ({ onClose, status, onDuplicate }) => {
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          count: duplicateCount,
          scheduleLater,
          scheduledDate,
          scheduledTime
        })
      });

      const data = await response.json();
      if (data.success) {
        if (onDuplicate) {
          onDuplicate({
            count: duplicateCount,
            scheduleLater,
            scheduledDate,
            scheduledTime,
            duplicated: data.duplicated
          });
        }
        onClose();
      }
    } catch (error) {
      console.error('Error duplicating status:', error);
      alert('Failed to duplicate status. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Copy className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Duplicate Status</h2>
              <p className="text-white/60 text-xs">Copy this status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-white/60 text-xs mb-2 block">Number of Copies</label>
            <input
              type="number"
              min="1"
              max="10"
              value={duplicateCount}
              onChange={(e) => setDuplicateCount(Number(e.target.value))}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleLater}
              onChange={(e) => setScheduleLater(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
            />
            <span className="text-white text-sm">Schedule for later</span>
          </label>

          {scheduleLater && (
            <div className="space-y-3 pl-4">
              <div>
                <label className="text-white/60 text-xs mb-2 block">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-2 block">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-[#00a884]" size={16} />
              <p className="text-white font-medium">Original Status</p>
            </div>
            <p className="text-white/60 text-sm">{status?.content || status?.caption || 'No content'}</p>
            <div className="flex items-center gap-2 text-white/40 text-xs mt-2">
              <Clock size={12} />
              <span>{new Date(status?.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleDuplicate}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Duplicate ({duplicateCount} {duplicateCount === 1 ? 'copy' : 'copies'})
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDuplicatePanel;
