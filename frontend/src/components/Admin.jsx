import { useState, useEffect } from 'react';
import { Shield, Users, MessageSquare, BarChart2, Trash2, UserX, RefreshCw, X, AlertCircle } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const Admin = ({ onClose }) => {
  const [stats, setStats] = useState({ users: 0, messages: 0, conversations: 0, activeNow: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/advanced/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data.stats || {});
      }
    } catch (e) {
      console.warn('Admin stats load failed:', e.message);
    }
    setLoading(false);
  };

  const showAction = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const STAT_CARDS = [
    { label: 'Total Users', value: stats.users || 0, icon: <Users size={22} className="text-blue-400" />, color: 'from-blue-600/20 to-blue-800/20' },
    { label: 'Messages Sent', value: stats.messages || 0, icon: <MessageSquare size={22} className="text-green-400" />, color: 'from-green-600/20 to-green-800/20' },
    { label: 'Conversations', value: stats.conversations || 0, icon: <BarChart2 size={22} className="text-purple-400" />, color: 'from-purple-600/20 to-purple-800/20' },
    { label: 'Online Now', value: stats.activeNow || 0, icon: <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />, color: 'from-emerald-600/20 to-emerald-800/20' },
  ];

  return (
    <div className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0d1f35] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-900/50 to-purple-900/50 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={22} className="text-red-400" />
            <div>
              <h2 className="text-white font-bold text-lg">Admin Panel</h2>
              <p className="text-white/50 text-xs">GENZ WhatsApp Ultra Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadStats} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <RefreshCw size={16} className={`text-white/60 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} className="text-white/60" />
              </button>
            )}
          </div>
        </div>

        {/* Action message */}
        {actionMsg && (
          <div className="mx-4 mt-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} /> {actionMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-4">
          {['overview', 'users', 'actions'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold capitalize transition-colors border-b-2 ${
                tab === t ? 'border-red-400 text-red-400' : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {STAT_CARDS.map((card, i) => (
                  <div key={i} className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      {card.icon}
                      <span className="text-2xl font-black text-white">{loading ? '...' : card.value.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-white/60 font-medium">{card.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <BarChart2 size={16} className="text-purple-400" /> System Health
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'MongoDB', status: 'Connected', ok: true },
                    { label: 'Socket.IO', status: 'Running', ok: true },
                    { label: 'Redis', status: 'Not configured (single-instance)', ok: false },
                    { label: 'Cloudinary', status: 'Configured', ok: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${item.ok ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-2">
              <p className="text-white/50 text-xs mb-3">User list requires backend connection. Showing demo data.</p>
              {['BennyGENZ', 'GENZ User', 'Admin'].map((name, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{name}</p>
                      <p className="text-white/40 text-xs">Last seen: today</p>
                    </div>
                  </div>
                  <button
                    onClick={() => showAction(`Action performed on ${name}`)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <UserX size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'actions' && (
            <div className="space-y-3">
              {[
                { label: 'Clear All Messages', icon: <Trash2 size={16} />, color: 'bg-red-600 hover:bg-red-700', action: () => showAction('Messages cleared (demo)') },
                { label: 'Broadcast Message to All Users', icon: <MessageSquare size={16} />, color: 'bg-blue-600 hover:bg-blue-700', action: () => showAction('Broadcast sent (demo)') },
                { label: 'Export User Data', icon: <BarChart2 size={16} />, color: 'bg-green-600 hover:bg-green-700', action: () => showAction('Export started (demo)') },
                { label: 'Reset Subscription DB', icon: <RefreshCw size={16} />, color: 'bg-yellow-600 hover:bg-yellow-700', action: () => showAction('Subscription reset (demo)') },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className={`w-full py-3 ${item.color} text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
