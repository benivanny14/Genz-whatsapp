import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, CheckCircle, Trash2 } from 'lucide-react';

const StatusPinPanel = ({ onClose, status, onPinAction }) => {
  const [pinnedStatuses, setPinnedStatuses] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [pinDuration, setPinDuration] = useState('24h');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPinnedStatuses();
  }, [status]);

  const loadPinnedStatuses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/pinned`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPinnedStatuses(data.statuses || []);
        const statusId = status?._id || status?.id;
        setIsPinned((data.statuses || []).some(s => String(s._id) === String(statusId)));
      }
    } catch (error) {
      console.error('Error loading pinned statuses:', error);
      // Fallback to localStorage
      try {
        const pinned = JSON.parse(localStorage.getItem('genz_pinned_statuses') || '[]');
        setPinnedStatuses(pinned);
        const statusId = status?._id || status?.id;
        setIsPinned(pinned.some(s => s.id === statusId));
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async () => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${statusId}/pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadPinnedStatuses();
    } catch (error) {
      console.error('Error pinning status:', error);
      // Fallback to localStorage
      const pinData = {
        id: statusId,
        content: status?.content || status?.caption,
        mediaUrl: status?.mediaUrl,
        type: status?.type,
        pinnedAt: new Date().toISOString(),
        duration: pinDuration
      };

      const updated = [...pinnedStatuses, pinData];
      setPinnedStatuses(updated);
      setIsPinned(true);
      localStorage.setItem('genz_pinned_statuses', JSON.stringify(updated));
    }

    if (onPinAction) {
      onPinAction({ action: 'pin', data: { statusId, duration: pinDuration } });
    }
  };

  const handleUnpin = async () => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${statusId}/pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadPinnedStatuses();
    } catch (error) {
      console.error('Error unpinning status:', error);
      // Fallback to localStorage
      const updated = pinnedStatuses.filter(s => s.id !== statusId);
      setPinnedStatuses(updated);
      setIsPinned(false);
      localStorage.setItem('genz_pinned_statuses', JSON.stringify(updated));
    }

    if (onPinAction) {
      onPinAction({ action: 'unpin', id: statusId });
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to unpin all statuses?')) {
      setPinnedStatuses([]);
      setIsPinned(false);
      localStorage.setItem('genz_pinned_statuses', JSON.stringify([]));
      
      if (onPinAction) {
        onPinAction({ action: 'clearAll' });
      }
    }
  };

  const getExpiryTime = (pinData) => {
    const pinnedAt = new Date(pinData.pinnedAt);
    const durationHours = parseInt(pinData.duration) || 24;
    const expiry = new Date(pinnedAt.getTime() + durationHours * 60 * 60 * 1000);
    return expiry;
  };

  const isExpired = (pinData) => {
    return new Date() > getExpiryTime(pinData);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MapPin className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Pin Status</h2>
              <p className="text-white/60 text-xs">{pinnedStatuses.length} pinned</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Status */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium">Current Status</p>
              {isPinned ? (
                <button
                  onClick={handleUnpin}
                  className="text-red-400 text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Unpin
                </button>
              ) : (
                <button
                  onClick={handlePin}
                  className="text-[#00a884] text-sm flex items-center gap-1"
                >
                  <MapPin size={14} />
                  Pin
                </button>
              )}
            </div>
            <p className="text-white/60 text-sm">{status?.content || status?.caption || 'No content'}</p>
            {!isPinned && (
              <div className="mt-3">
                <label className="text-white/60 text-xs mb-2 block">Pin Duration</label>
                <select
                  value={pinDuration}
                  onChange={(e) => setPinDuration(e.target.value)}
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                >
                  <option value="1h" className="bg-[#1a2e35]">1 hour</option>
                  <option value="24h" className="bg-[#1a2e35]">24 hours</option>
                  <option value="48h" className="bg-[#1a2e35]">2 days</option>
                  <option value="168h" className="bg-[#1a2e35]">1 week</option>
                  <option value="720h" className="bg-[#1a2e35]">1 month</option>
                </select>
              </div>
            )}
          </div>

          {/* Pinned Statuses */}
          {pinnedStatuses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-medium">Pinned Statuses</p>
                <button
                  onClick={handleClearAll}
                  className="text-red-400 text-sm"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pinnedStatuses.map((pin) => {
                  const expired = isExpired(pin);
                  const expiry = getExpiryTime(pin);
                  return (
                    <div
                      key={pin.id}
                      className={`bg-white/5 rounded-lg p-3 flex items-center gap-3 ${
                        expired ? 'opacity-50' : ''
                      }`}
                    >
                      <MapPin size={16} className={expired ? 'text-gray-500' : 'text-[#00a884]'} />
                      <div className="flex-1">
                        <p className="text-white text-sm truncate">{pin.content}</p>
                        <div className="flex items-center gap-2 text-white/40 text-xs mt-1">
                          <Clock size={12} />
                          <span>{expired ? 'Expired' : `Expires: ${expiry.toLocaleString()}`}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = pinnedStatuses.filter(s => s.id !== pin.id);
                          setPinnedStatuses(updated);
                          if (pin.id === (status?._id || status?.id)) {
                            setIsPinned(false);
                          }
                          localStorage.setItem('genz_pinned_statuses', JSON.stringify(updated));
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusPinPanel;
