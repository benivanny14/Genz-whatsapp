import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, BellOff, Bell, CheckCircle, Clock } from 'lucide-react';

const StatusMutePanel = ({ onClose, status, onMute }) => {
  const [muteDuration, setMuteDuration] = useState('24h');
  const [muteReason, setMuteReason] = useState('');
  const [isMuting, setIsMuting] = useState(false);

  const durations = [
    { id: '1h', label: '1 Hour' },
    { id: '8h', label: '8 Hours' },
    { id: '24h', label: '24 Hours' },
    { id: '1w', label: '1 Week' },
    { id: '1m', label: '1 Month' },
    { id: 'forever', label: 'Forever' }
  ];

  const handleMute = async () => {
    setIsMuting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration: muteDuration,
          reason: muteReason
        })
      });

      const data = await response.json();
      if (data.success) {
        const muteData = {
          statusId: status?._id || status?.id,
          userId: status?.user?._id || status?.user?.id,
          duration: muteDuration,
          reason: muteReason,
          mutedAt: new Date().toISOString()
        };

        if (onMute) {
          onMute(muteData);
        }

        onClose();
      }
    } catch (error) {
      console.error('Error muting status:', error);
      alert('Failed to mute status. Please try again.');
    } finally {
      setIsMuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BellOff className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Mute Status Updates</h2>
              <p className="text-white/60 text-xs">Stop seeing this user's statuses</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* User Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#00a884]/20 rounded-full flex items-center justify-center text-white font-bold">
                {status?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-medium">{status?.username || 'Unknown'}</p>
                <p className="text-white/60 text-sm">Status notifications will be muted</p>
              </div>
            </div>
          </div>

          {/* Mute Duration */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Mute Duration</label>
            <div className="grid grid-cols-2 gap-2">
              {durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => setMuteDuration(duration.id)}
                  className={`p-3 rounded-xl text-center transition-colors ${
                    muteDuration === duration.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {duration.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mute Reason */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Reason (Optional)</label>
            <textarea
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              placeholder="Why are you muting this user?"
              rows={2}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Clock className="text-white/60 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white text-sm font-medium">What happens when muted?</p>
                <ul className="text-white/60 text-xs mt-2 space-y-1">
                  <li>• You won't see new status updates</li>
                  <li>• No notifications from this user</li>
                  <li>• You can still view their status manually</li>
                  <li>• Mute will automatically expire after duration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20 space-y-2">
          <button
            onClick={handleMute}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <BellOff size={20} />
            Mute Status Updates
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusMutePanel;
