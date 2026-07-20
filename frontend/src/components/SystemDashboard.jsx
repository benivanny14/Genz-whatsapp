import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Users, TrendingUp, Activity, Clock, 
  BarChart2, Wifi, WifiOff, X, RefreshCw, Award, Zap,
  Eye, Star
} from 'lucide-react';

import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const StatCard = ({ icon, label, value, sub, color = 'blue', trend }) => {
  const colors = {
    blue: 'from-blue-600/20 to-blue-900/20 border-blue-500/20 text-blue-400',
    green: 'from-green-600/20 to-green-900/20 border-green-500/20 text-green-400',
    purple: 'from-purple-600/20 to-purple-900/20 border-purple-500/20 text-purple-400',
    orange: 'from-orange-600/20 to-orange-900/20 border-orange-500/20 text-orange-400',
    red: 'from-red-600/20 to-red-900/20 border-red-500/20 text-red-400',
    yellow: 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/20 text-yellow-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <div className={colors[color].split(' ').find(c => c.startsWith('text-'))}>{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-xs text-white font-medium">{label}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const MiniBar = ({ value, max, color = '#00a884' }) => (
  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }}
    />
  </div>
);

const SystemDashboard = ({ onClose }) => {
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, rankRes] = await Promise.all([
        fetch(`${API_URL}/advanced/dashboard/stats`, { headers }),
        fetch(`${API_URL}/advanced/dashboard/online-ranking`, { headers })
      ]);
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats); }
      if (rankRes.ok) { const d = await rankRes.json(); setRanking(d.ranking || []); }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  const maxMsgs = stats?.dailyChart ? Math.max(...stats.dailyChart.map(d => d.messages), 1) : 1;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="bg-[#071525] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg">System Dashboard</h2>
              <p className="text-blue-300 text-xs flex items-center gap-1">
                <Activity size={10} /> Real-time analytics
                {lastUpdated && <span className="text-gray-600 ml-2">• Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(r => !r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${autoRefresh ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}
            >
              {autoRefresh ? '● Live' : 'Auto'}
            </button>
            <button onClick={fetchStats} className="p-2 hover:bg-white/10 rounded-full text-gray-400" title="Refresh" aria-label="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'online', label: '🟢 Online Users' },
            { id: 'chart', label: '📈 Charts' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && !stats ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Inapakia data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {tab === 'overview' && stats && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard icon={<MessageSquare size={20} />} label="Msgs Leo" value={stats.messagesToday} sub="Jumla" color="blue" />
                    <StatCard icon={<Users size={20} />} label="Chats Leo" value={stats.chatsTodayCount} sub={`${stats.chatsCount} total`} color="green" />
                    <StatCard icon={<Wifi size={20} />} label="Online Sasa" value={stats.onlineContactsCount} sub="Mawasiliano" color="purple" />
                    <StatCard icon={<TrendingUp size={20} />} label="Wiki Hii" value={stats.messagesThisWeek} sub="Ujumbe" color="orange" />
                    <StatCard icon={<Eye size={20} />} label="Statuses" value={stats.activeStatuses} sub="Active" color="yellow" />
                    <StatCard icon={<Zap size={20} />} label="Total Msgs" value={stats.totalMessages} sub="Wote" color="red" />
                  </div>

                  {/* Top Conversations */}
                  {stats.topConversations?.length > 0 && (
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                      <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                        <Star size={16} className="text-yellow-400" /> Chats Maarufu Leo
                      </h3>
                      <div className="space-y-3">
                        {stats.topConversations.map((conv, i) => (
                          <div key={conv.conversationId || i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-white text-xs font-medium truncate">{conv.name}</span>
                                <div className="flex items-center gap-2">
                                  {conv.isOnline && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                                  <span className="text-gray-400 text-xs">{conv.todayMessages} leo</span>
                                </div>
                              </div>
                              <MiniBar value={conv.todayMessages} max={stats.topConversations[0]?.todayMessages || 1} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Online Users Tab */}
              {tab === 'online' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">{ranking.filter(u => u.isOnline).length} watu wako online sasa</p>
                    <span className="text-xs text-gray-600">Jumla: {ranking.length}</span>
                  </div>
                  {ranking.length === 0 && (
                    <div className="text-center py-12">
                      <WifiOff size={40} className="text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">Hakuna watumiaji</p>
                    </div>
                  )}
                  {ranking.map((user) => (
                    <div key={user.userId} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-xs w-5 text-center font-bold">#{user.rank}</span>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            {user.profilePicture
                              ? <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                              : user.username?.charAt(0)?.toUpperCase()
                            }
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#071525] ${user.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user.username}</p>
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          {user.isOnline ? (
                            <><Wifi size={10} className="text-green-400" /> Online</>
                          ) : (
                            <><Clock size={10} /> {user.lastSeen ? `Last seen: ${new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}</>
                          )}
                        </p>
                      </div>
                      {user.rank <= 3 && (
                        <Award size={16} className={user.rank === 1 ? 'text-yellow-400' : user.rank === 2 ? 'text-gray-300' : 'text-orange-400'} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Chart Tab */}
              {tab === 'chart' && stats?.dailyChart && (
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <BarChart2 size={16} className="text-blue-400" /> Ujumbe - Siku 7 Zilizopita
                  </h3>
                  {/* Bar chart */}
                  <div className="flex items-end gap-2 h-32 mb-2">
                    {stats.dailyChart.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-gray-500 font-mono">{day.messages}</span>
                        <div
                          className="w-full rounded-t-md transition-all duration-700 min-h-1"
                          style={{
                            height: `${maxMsgs > 0 ? Math.max((day.messages / maxMsgs) * 100, 4) : 4}%`,
                            background: i === stats.dailyChart.length - 1
                              ? 'linear-gradient(to top, #00a884, #00d4a0)'
                              : 'linear-gradient(to top, #1e3a5f, #2e4a7f)'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* X-axis labels */}
                  <div className="flex gap-2">
                    {stats.dailyChart.map((day, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] text-gray-600">{day.date.split(',')[0]}</div>
                    ))}
                  </div>

                  {/* Online contacts list from overview */}
                  {stats.onlineContacts?.length > 0 && (
                    <div className="mt-5 bg-white/5 rounded-xl border border-white/10 p-4">
                      <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                        <Wifi size={14} className="text-green-400" /> Mawasiliano Online Sasa
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {stats.onlineContacts.map((u) => (
                          <div key={u.userId} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-green-300 text-xs font-medium">{u.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;
