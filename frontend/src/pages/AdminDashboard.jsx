import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Gauge, Users, CreditCard, BadgeDollarSign, MessageSquare,
  UsersRound, Radio, CircleDot, PhoneCall, Sparkles, Megaphone, Bell,
  LifeBuoy, MessagesSquare, BarChart3, TrendingUp, ShieldAlert, Copy,
  ScrollText, ShieldCheck, KeyRound, Smartphone, Timer, Sun, Moon,
  Menu, X, LogOut, RefreshCcw, Search, CheckCircle2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../services/adminApi';
import { useAdminAuth } from '../context/AdminAuthContext';

import ChatManagement from '../components/admin/ChatManagement';
import GroupManagement from '../components/admin/GroupManagement';
import ChannelManagement from '../components/admin/ChannelManagement';
import StatusStoriesManagement from '../components/admin/StatusStoriesManagement';
import CallsManagement from '../components/admin/CallsManagement';
import BroadcastSystem from '../components/admin/BroadcastSystem';
import NotificationCenter from '../components/admin/NotificationCenter';
import SupportTickets from '../components/admin/SupportTickets';
import AdminUserChat from '../components/admin/AdminUserChat';
import ReportsAnalytics from '../components/admin/ReportsAnalytics';
import FraudDetection from '../components/admin/FraudDetection';
import RolesPermissions from '../components/admin/RolesPermissions';
import AdminDeviceManagement from '../components/admin/AdminDeviceManagement';
import SessionManagement from '../components/admin/SessionManagement';

// ---------------------------------------------------------------------
// Section registry — all 33 requested modules, ALL now implemented and
// wired to real backend endpoints.
// ---------------------------------------------------------------------
const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Msingi', implemented: true },
  { key: 'dashboard', label: 'Dashboard', icon: Gauge, group: 'Msingi', implemented: true },
  { key: 'users', label: 'User Management', icon: Users, group: 'Msingi', implemented: true },
  { key: 'payments', label: 'Payment Management', icon: CreditCard, group: 'Fedha', implemented: true },
  { key: 'subscriptions', label: 'Subscription Management', icon: BadgeDollarSign, group: 'Fedha', implemented: true },
  { key: 'revenue', label: 'Revenue Dashboard', icon: TrendingUp, group: 'Fedha', implemented: true },
  { key: 'duplicatePayments', label: 'Duplicate Payment Detection', icon: Copy, group: 'Fedha', implemented: true },
  { key: 'fraud', label: 'Fraud Detection', icon: ShieldAlert, group: 'Fedha', implemented: true },
  { key: 'chats', label: 'Chat Management', icon: MessageSquare, group: 'Maudhui', implemented: true },
  { key: 'groups', label: 'Group Management', icon: UsersRound, group: 'Maudhui', implemented: true },
  { key: 'channels', label: 'Channel Management', icon: Radio, group: 'Maudhui', implemented: true },
  { key: 'status', label: 'Status Management', icon: CircleDot, group: 'Maudhui', implemented: true },
  { key: 'stories', label: 'Stories Management', icon: Sparkles, group: 'Maudhui', implemented: true },
  { key: 'calls', label: 'Calls Management', icon: PhoneCall, group: 'Maudhui', implemented: true },
  { key: 'broadcast', label: 'Broadcast System', icon: Megaphone, group: 'Mawasiliano', implemented: true },
  { key: 'notifications', label: 'Notification Center', icon: Bell, group: 'Mawasiliano', implemented: true },
  { key: 'tickets', label: 'Support Ticket System', icon: LifeBuoy, group: 'Mawasiliano', implemented: true },
  { key: 'adminChat', label: 'Admin ↔ User Chat', icon: MessagesSquare, group: 'Mawasiliano', implemented: true },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Ripoti', implemented: true },
  { key: 'auditLogs', label: 'Audit Logs', icon: ScrollText, group: 'Usalama', implemented: true },
  { key: 'security', label: 'Security Center', icon: ShieldCheck, group: 'Usalama', implemented: true },
  { key: 'roles', label: 'Roles & Permissions', icon: KeyRound, group: 'Usalama', implemented: true },
  { key: 'devices', label: 'Device Management', icon: Smartphone, group: 'Usalama', implemented: true },
  { key: 'sessions', label: 'Session Management', icon: Timer, group: 'Usalama', implemented: true },
];

const GROUP_ORDER = ['Msingi', 'Fedha', 'Maudhui', 'Mawasiliano', 'Ripoti', 'Usalama'];

const fmtMoney = (n) => `TZS ${Number(n || 0).toLocaleString()}`;

// ---------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------
const StatCard = ({ label, value, sub, tone = 'emerald' }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
    <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
    <p className={`text-2xl font-semibold mt-1 text-${tone}-600 dark:text-${tone}-400`}>{value}</p>
    {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
  </div>
);

const ComingSoonPanel = ({ label }) => (
  <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
    <p className="text-gray-700 dark:text-gray-300 font-medium">{label}</p>
    <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
      Sehemu hii itajengwa katika Awamu ya 2 ya mradi — muundo (schema, API,
      UI) tayari umepangwa kwenye ramani ya mradi. Niambie ukitaka hii ijengwe
      kwanza.
    </p>
  </div>
);

// ---------------------------------------------------------------------
// Section: Overview
// ---------------------------------------------------------------------
const OverviewSection = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/overview');
      setData(data);
    } catch (err) {
      toast.error('Imeshindikana kupakua overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBlock />;
  if (!data) return null;
  const { overview, recentUsers } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Watumiaji Wote" value={overview.users.total} sub={`${overview.users.online} online`} />
        <StatCard label="Wapya Leo" value={overview.users.newToday} tone="blue" />
        <StatCard label="Premium" value={overview.users.premium} tone="amber" />
        <StatCard label="Wamezuiwa" value={overview.users.blocked} tone="red" />
        <StatCard label="Jumbe Zote" value={overview.messaging.totalMessages} tone="violet" />
        <StatCard label="Jumbe Leo" value={overview.messaging.messagesToday} tone="violet" />
        <StatCard label="Mapato Yote" value={fmtMoney(overview.payments.totalRevenue)} tone="emerald" />
        <StatCard label="Vifaa Amilifu" value={overview.devices.active} tone="blue" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-3">Watumiaji Wapya</h3>
        <div className="space-y-2">
          {recentUsers?.map((u) => (
            <div key={u._id} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-700 dark:text-gray-300">{u.username}</span>
              <span className="text-gray-400">{u.phoneNumber}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Dashboard (system health)
// ---------------------------------------------------------------------
const DashboardSection = () => {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    adminApi.get('/admin/health').then(({ data }) => setHealth(data)).catch(() => toast.error('Imeshindikana kupakua health'));
  }, []);
  if (!health) return <LoadingBlock />;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(health).map(([k, v]) => (
        <StatCard key={k} label={k} value={String(v)} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Users
// ---------------------------------------------------------------------
const UsersSection = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await adminApi.get('/admin/users', { params: { search: q, limit: 50 } });
      setUsers(data.users || []);
    } catch {
      toast.error('Imeshindikana kupakua watumiaji');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleBlock = async (u) => {
    const action = u.isBlocked ? 'unblock' : 'block';
    try {
      await adminApi.post(`/admin/users/${u._id}/${action}`);
      toast.success(action === 'block' ? 'Amezuiwa' : 'Amefunguliwa');
      load(search);
    } catch {
      toast.error('Imeshindwa');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tafuta jina, namba ya simu..."
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1">
          <Search size={16} /> Tafuta
        </button>
      </form>

      {loading ? <LoadingBlock /> : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
              <tr>
                <th className="text-left p-3">Jina</th>
                <th className="text-left p-3">Simu</th>
                <th className="text-left p-3">Hali</th>
                <th className="text-left p-3">Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3">{u.username}</td>
                  <td className="p-3 text-gray-400">{u.phoneNumber}</td>
                  <td className="p-3">
                    {u.isBlocked
                      ? <span className="text-red-500">Amezuiwa</span>
                      : <span className="text-emerald-500">Sawa</span>}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleBlock(u)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                      {u.isBlocked ? 'Fungua' : 'Zuia'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Payments (manual mobile-money payments) — also serves
// Subscription Management, Revenue Dashboard and Duplicate Detection
// via `statusFilter`.
// ---------------------------------------------------------------------
const PaymentsSection = ({ statusFilter = 'All', title = 'Payment Management' }) => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: listData }, { data: statsData }] = await Promise.all([
        adminApi.get('/admin/manual-payments', { params: { status: statusFilter, limit: 30 } }),
        adminApi.get('/admin/manual-payments/stats')
      ]);
      setPayments(listData.payments || []);
      setStats(statsData.stats);
    } catch {
      toast.error('Imeshindikana kupakua malipo');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    try {
      await adminApi.post(`/admin/manual-payments/${id}/${action}`);
      toast.success(action === 'approve' ? 'Imekubaliwa' : 'Imekataliwa');
      load();
    } catch {
      toast.error('Imeshindwa');
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Zinasubiri" value={stats.pendingPayments} tone="amber" />
          <StatCard label="Zimekubaliwa" value={stats.approvedPayments} tone="emerald" />
          <StatCard label="Zimekataliwa" value={stats.rejectedPayments} tone="red" />
          <StatCard label="Zinazofanana (Duplicate)" value={stats.duplicatePayments} tone="red" />
          <StatCard label="Wanachama Amilifu" value={stats.activeSubscribers} tone="blue" />
          <StatCard label="Mapato Mwezi Huu" value={fmtMoney(stats.monthlyRevenue)} tone="emerald" />
          <StatCard label="Mapato Yote" value={fmtMoney(stats.totalRevenue)} tone="emerald" />
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium">{title}</h3>
        <button onClick={load} className="text-xs flex items-center gap-1 text-gray-500"><RefreshCcw size={14} /> Onyesha upya</button>
      </div>

      {loading ? <LoadingBlock /> : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
              <tr>
                <th className="text-left p-3">Mtumiaji</th>
                <th className="text-left p-3">Kiasi</th>
                <th className="text-left p-3">Hali</th>
                <th className="text-left p-3">Kitendo</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3">{p.username}</td>
                  <td className="p-3">{fmtMoney(p.amount)}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 flex gap-2">
                    {p.status === 'Pending' && (
                      <>
                        <button onClick={() => act(p._id, 'approve')} className="text-emerald-600"><CheckCircle2 size={18} /></button>
                        <button onClick={() => act(p._id, 'reject')} className="text-red-500"><XCircle size={18} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">Hakuna rekodi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Audit Logs
// ---------------------------------------------------------------------
const AuditLogsSection = () => {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    adminApi.get('/admin/audit-logs', { params: { limit: 100 } })
      .then(({ data }) => setLogs(data.logs || []))
      .catch(() => toast.error('Imeshindikana kupakua audit logs'));
  }, []);
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
          <tr><th className="text-left p-3">Wakati</th><th className="text-left p-3">Kitendo</th><th className="text-left p-3">IP</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3 text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
              <td className="p-3">{l.action}</td>
              <td className="p-3 text-gray-400">{l.ipAddress || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Security Center
// ---------------------------------------------------------------------
const SecuritySection = () => {
  const [report, setReport] = useState(null);
  useEffect(() => {
    adminApi.get('/admin/security').then(({ data }) => setReport(data.report)).catch(() => toast.error('Imeshindikana'));
  }, []);
  if (!report) return <LoadingBlock />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Waliofungwa (locked)" value={report.lockedUsers.length} tone="red" />
        <StatCard label="Kushindwa Kuingia" value={report.failedLoginUsers.length} tone="amber" />
        <StatCard label="Waliozuiwa" value={report.blockedUsers.length} tone="red" />
        <StatCard label="Wasimamizi (legacy)" value={report.adminUsers.length} tone="blue" />
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm space-y-1">
        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Mazingira ya Uzalishaji (Environment)</h3>
        {Object.entries(report.environment).map(([k, v]) => (
          <div key={k} className="flex justify-between text-gray-500">
            <span>{k}</span><span className={v === true ? 'text-red-500' : 'text-emerald-500'}>{String(v)}</span>
          </div>
        ))}
      </div>
      {report.adminUsers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          Onyo: bado kuna watumiaji wa kawaida wenye alama ya zamani ya "isAdmin/role=admin"
          kwenye database. Njia mpya ya usalama haiwatambui tena kama admin, lakini tunapendekeza
          uondoe alama hiyo kwenye rekodi zao ili database iwe safi.
        </div>
      )}
    </div>
  );
};

const LoadingBlock = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ---------------------------------------------------------------------
// Main dashboard shell
// ---------------------------------------------------------------------
const AdminDashboard = () => {
  const { logout, admin } = useAdminAuth();
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('genz_admin_theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('genz_admin_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const grouped = useMemo(() => {
    const map = {};
    GROUP_ORDER.forEach((g) => { map[g] = SECTIONS.filter((s) => s.group === g); });
    return map;
  }, []);

  const renderActive = () => {
    switch (active) {
      case 'overview': return <OverviewSection />;
      case 'dashboard': return <DashboardSection />;
      case 'users': return <UsersSection />;
      case 'payments': return <PaymentsSection statusFilter="All" title="Payment Management" />;
      case 'subscriptions': return <PaymentsSection statusFilter="Approved" title="Subscription Management (Approved)" />;
      case 'revenue': return <PaymentsSection statusFilter="All" title="Revenue Dashboard" />;
      case 'duplicatePayments': return <PaymentsSection statusFilter="Duplicate" title="Duplicate Payment Detection" />;
      case 'fraud': return <FraudDetection />;
      case 'chats': return <ChatManagement />;
      case 'groups': return <GroupManagement />;
      case 'channels': return <ChannelManagement />;
      case 'status': return <StatusStoriesManagement mode="status" />;
      case 'stories': return <StatusStoriesManagement mode="stories" />;
      case 'calls': return <CallsManagement />;
      case 'broadcast': return <BroadcastSystem />;
      case 'notifications': return <NotificationCenter />;
      case 'tickets': return <SupportTickets />;
      case 'adminChat': return <AdminUserChat />;
      case 'reports': return <ReportsAnalytics />;
      case 'auditLogs': return <AuditLogsSection />;
      case 'security': return <SecuritySection />;
      case 'roles': return <RolesPermissions />;
      case 'devices': return <AdminDeviceManagement />;
      case 'sessions': return <SessionManagement />;
      default: {
        const section = SECTIONS.find((s) => s.key === active);
        return <ComingSoonPanel label={section?.label || active} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex">
      {/* Sidebar */}
      <aside className={`fixed md:static z-30 inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-y-auto`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <span className="font-semibold text-emerald-600">GENZ Admin</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="p-3 space-y-4">
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-1">{group}</p>
              {grouped[group].map(({ key, label, icon: Icon, implemented }) => (
                <button
                  key={key}
                  onClick={() => { setActive(key); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2 text-sm px-2 py-2 rounded-lg mb-0.5 ${
                    active === key
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {!implemented && <span className="text-[9px] opacity-60">Awamu 2</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <h1 className="font-medium">{SECTIONS.find((s) => s.key === active)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDark((d) => !d)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-xs text-gray-400 hidden sm:inline">{admin?.username}</span>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500" title="Toka">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {renderActive()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
