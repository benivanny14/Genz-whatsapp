import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, X, Wifi, WifiOff, Calendar } from 'lucide-react';
import { api } from '../services/api';

const OnlineHistoryDashboard = ({ onClose, targetUserId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSessions: 0, avgDuration: 0, mostActiveHour: 0 });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch own history or target user history
        const endpoint = targetUserId
          ? `/users/${targetUserId}/online-history`
          : '/users/me/online-history';
        const res = await api.get(endpoint);
        const sessions = res.data?.onlineHistory || [];
        setHistory(sessions);

        // Compute stats
        if (sessions.length > 0) {
          const totalDur = sessions.reduce((s, h) => s + (h.duration || 0), 0);
          const hourCounts = new Array(24).fill(0);
          sessions.forEach(h => {
            if (h.connectedAt) {
              hourCounts[new Date(h.connectedAt).getHours()]++;
            }
          });
          const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
          setStats({
            totalSessions: sessions.length,
            avgDuration: sessions.length ? Math.round(totalDur / sessions.length) : 0,
            mostActiveHour,
          });
        }
      } catch (_) {
        // Fallback: show empty state
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [targetUserId]);

  // Build 24-hour activity chart from real data
  const hourBuckets = new Array(24).fill(0);
  history.forEach(h => {
    if (h.connectedAt) hourBuckets[new Date(h.connectedAt).getHours()]++;
  });
  const maxBucket = Math.max(...hourBuckets, 1);

  const fmtDur = (secs) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  const fmtTime = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#111b21] w-full max-w-lg rounded-2xl shadow-2xl border border-[#2a3942] overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-[#202c33] flex justify-between items-center border-b border-[#2a3942]">
          <div className="flex items-center gap-3">
            <TrendingUp size={22} className="text-[#00a884]" />
            <div>
              <h2 className="font-bold text-white">Online Activity</h2>
              <p className="text-[#8696a0] text-xs">{stats.totalSessions} sessions recorded</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1 rounded-full hover:bg-[#2a3942] transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Sessions', value: stats.totalSessions, icon: Wifi },
                  { label: 'Avg Duration', value: fmtDur(stats.avgDuration), icon: Clock },
                  { label: 'Peak Hour', value: `${stats.mostActiveHour}:00`, icon: Calendar },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-[#202c33] rounded-xl p-3 text-center border border-[#2a3942]">
                    <Icon size={16} className="text-[#00a884] mx-auto mb-1" />
                    <p className="text-white font-bold text-lg">{value}</p>
                    <p className="text-[#8696a0] text-xs">{label}</p>
                  </div>
                ))}
              </div>

              {/* 24h activity chart */}
              <div className="bg-[#202c33] rounded-xl p-4 border border-[#2a3942]">
                <p className="text-[#8696a0] text-xs font-semibold uppercase mb-3">Activity by Hour</p>
                <div className="flex items-end gap-1 h-20">
                  {hourBuckets.map((count, h) => (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm transition-all"
                        style={{
                          height: `${Math.max(4, (count / maxBucket) * 64)}px`,
                          backgroundColor: count > 0 ? '#00a884' : '#2a3942'
                        }}
                      />
                      {h % 6 === 0 && <span className="text-[8px] text-[#8696a0]">{h}h</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Session list */}
              <div className="bg-[#202c33] rounded-xl border border-[#2a3942] overflow-hidden">
                <p className="text-[#8696a0] text-xs font-semibold uppercase px-4 py-2 border-b border-[#2a3942]">Recent Sessions</p>
                {history.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-[#8696a0]">
                    <WifiOff size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">No sessions recorded yet</p>
                    <p className="text-xs mt-1">Data is collected as you use the app</p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#2a3942]">
                    {[...history].reverse().slice(0, 20).map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#00a884]" />
                          <span className="text-white text-xs">{fmtTime(s.connectedAt)}</span>
                        </div>
                        <span className="text-[#8696a0] text-xs bg-[#2a3942] px-2 py-0.5 rounded-full">
                          {fmtDur(s.duration || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OnlineHistoryDashboard;
