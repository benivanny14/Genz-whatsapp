import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  Ban,
  BarChart3,
  CheckCircle,
  ClipboardList,
  CreditCard,
  Crown,
  Database,
  Lock,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Unlock,
  UserCheck,
  UserX,
  Users,
  Wifi,
  XCircle
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');
const formatMoney = (value) => `Tsh ${formatNumber(value)}`;
const formatDate = (value) => (value ? new Date(value).toLocaleString('sw-TZ') : 'N/A');
const riskySecurityFlags = new Set(['anonymousDeviceAuthEnabled', 'mockPaymentsEnabled']);

const StatCard = ({ icon, label, value, sub, color = 'blue', trend }) => {
  const colors = {
    blue: 'border-blue-500/30 text-blue-300 bg-blue-500/10',
    green: 'border-green-500/30 text-green-300 bg-green-500/10',
    orange: 'border-orange-500/30 text-orange-300 bg-orange-500/10',
    red: 'border-red-500/30 text-red-300 bg-red-500/10',
    purple: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
    teal: 'border-teal-500/30 text-teal-300 bg-teal-500/10'
  };

  return (
    <div className={`border ${colors[color]} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-white/5">{icon}</div>
        {typeof trend === 'number' && (
          <span className={`text-xs flex items-center gap-1 font-semibold ${trend >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-black text-white">{value ?? '0'}</div>
        <div className="text-xs text-white/55 mt-1">{label}</div>
        {sub && <div className="text-xs text-white/35 mt-1">{sub}</div>}
      </div>
    </div>
  );
};

const Panel = ({ icon, title, children, action }) => (
  <section className="border border-white/10 rounded-lg bg-white/[0.04] p-4">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const StatusPill = ({ good, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
    good ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
  }`}>
    {good ? <CheckCircle size={12} /> : <XCircle size={12} />}
    {children}
  </span>
);

const IconButton = ({ title, onClick, children, tone = 'neutral', disabled = false }) => {
  const tones = {
    neutral: 'bg-white/5 hover:bg-white/10 text-white/75',
    green: 'bg-green-500/15 hover:bg-green-500/25 text-green-300',
    red: 'bg-red-500/15 hover:bg-red-500/25 text-red-300',
    orange: 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-300',
    blue: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300'
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [securityReport, setSecurityReport] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStatus, setUserStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [actionMsg, setActionMsg] = useState('');
  const actionTimerRef = useRef(null);

  const showAction = (message) => {
    setActionMsg(message);
    window.clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(() => setActionMsg(''), 3000);
  };

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const userQuery = new URLSearchParams({ limit: '100' });
      if (searchTerm.trim()) userQuery.set('search', searchTerm.trim());
      if (userStatus !== 'all') userQuery.set('status', userStatus);

      const [overviewRes, usersRes, paymentsRes, securityRes, logsRes, healthRes] = await Promise.allSettled([
        authFetch(`${API_URL}/admin/overview`),
        authFetch(`${API_URL}/admin/users?${userQuery.toString()}`),
        authFetch(`${API_URL}/payment/admin/all-payments`),
        authFetch(`${API_URL}/admin/security`),
        authFetch(`${API_URL}/admin/audit-logs?limit=50`),
        authFetch(`${API_URL}/admin/health`)
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value.ok) {
        const data = await overviewRes.value.json();
        setOverview(data);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data = await usersRes.value.json();
        setUsers(data.users || []);
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.ok) {
        const data = await paymentsRes.value.json();
        setPayments(data.payments || []);
      }
      if (securityRes.status === 'fulfilled' && securityRes.value.ok) {
        const data = await securityRes.value.json();
        setSecurityReport(data.report || null);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
        const data = await logsRes.value.json();
        setAuditLogs(data.logs || []);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        const data = await healthRes.value.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Admin dashboard fetch failed:', error);
      showAction('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, userStatus]);

  useEffect(() => {
    fetchAll();
    const interval = window.setInterval(fetchAll, 30000);
    return () => window.clearInterval(interval);
  }, [fetchAll]);

  const runAction = async (url, options, successMessage) => {
    const response = await authFetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Action failed');
    }
    showAction(successMessage);
    await fetchAll();
  };

  const activatePremium = (userId) => runAction(
    `${API_URL}/payment/admin/activate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, durationDays: 60 })
    },
    'Premium imewashwa'
  ).catch((error) => showAction(error.message));

  const deactivatePremium = (userId) => runAction(
    `${API_URL}/payment/admin/deactivate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    },
    'Premium imezimwa'
  ).catch((error) => showAction(error.message));

  const setBlocked = (user, blocked) => runAction(
    `${API_URL}/admin/users/${user._id}/${blocked ? 'block' : 'unblock'}`,
    { method: 'POST' },
    blocked ? 'Mtumiaji amezuiwa' : 'Mtumiaji ameruhusiwa'
  ).catch((error) => showAction(error.message));

  const setRole = (user, admin) => runAction(
    `${API_URL}/admin/users/${user._id}/${admin ? 'promote' : 'demote'}`,
    { method: 'POST' },
    admin ? 'Mtumiaji amekuwa admin' : 'Admin amerudishwa user'
  ).catch((error) => showAction(error.message));

  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const matchesStatus = paymentStatus === 'all' || payment.status === paymentStatus || payment.paymentStatus === paymentStatus;
    const matchesSearch = !searchTerm || JSON.stringify(payment).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }), [payments, paymentStatus, searchTerm]);

  const stats = overview?.overview;
  const tabs = [
    { id: 'overview', icon: <BarChart3 size={16} />, label: 'Overview' },
    { id: 'users', icon: <Users size={16} />, label: 'Users' },
    { id: 'payments', icon: <CreditCard size={16} />, label: 'Payments' },
    { id: 'security', icon: <Shield size={16} />, label: 'Security' },
    { id: 'system', icon: <Server size={16} />, label: 'System' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2a] text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#25d366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white">
      <header className="sticky top-0 z-40 bg-[#075e54] px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-lg leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-green-100/80 truncate">GENZ WhatsApp control center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill good={systemHealth?.status === 'online'}>
              {systemHealth?.status || 'degraded'}
            </StatusPill>
            <IconButton title="Refresh" onClick={fetchAll} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </IconButton>
          </div>
        </div>
      </header>

      {actionMsg && (
        <div className="mx-4 mt-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm text-white">
          {actionMsg}
        </div>
      )}

      <nav className="flex gap-2 px-4 py-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#25d366] text-[#071b16]' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="px-4 pb-10 space-y-4">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={<Users size={20} />} label="Watumiaji" value={formatNumber(stats?.users?.total)} sub={`${formatNumber(stats?.users?.online)} online`} color="blue" />
              <StatCard icon={<Award size={20} />} label="Premium Active" value={formatNumber(stats?.payments?.activeSubscriptions)} sub={formatMoney(stats?.payments?.totalRevenue)} color="green" />
              <StatCard icon={<Activity size={20} />} label="Messages Today" value={formatNumber(stats?.messaging?.messagesToday)} sub={`${formatNumber(stats?.messaging?.totalMessages)} total`} color="purple" />
              <StatCard icon={<Wifi size={20} />} label="Active Devices" value={formatNumber(stats?.devices?.active)} sub={`${formatNumber(stats?.messaging?.activeStatuses)} statuses`} color="orange" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Panel icon={<Users size={18} className="text-blue-300" />} title="Recent Users">
                <div className="space-y-2">
                  {(overview?.recentUsers || []).map((user) => (
                    <div key={user._id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user.username}</p>
                        <p className="text-xs text-white/40 truncate">{user.phoneNumber || user.email || 'N/A'}</p>
                      </div>
                      <StatusPill good={!user.isBlocked}>{user.isBlocked ? 'blocked' : user.role || 'user'}</StatusPill>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel icon={<CreditCard size={18} className="text-green-300" />} title="Recent Payments">
                <div className="space-y-2">
                  {(overview?.recentPayments || []).map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{payment.phoneNumber || payment.userId}</p>
                        <p className="text-xs text-white/40 truncate">{payment.paymentMethod} - {formatDate(payment.updatedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-300">{formatMoney(payment.amount)}</p>
                        <p className="text-xs text-white/40">{payment.paymentStatus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <Panel
            icon={<Users size={18} className="text-blue-300" />}
            title="User Management"
            action={(
              <select value={userStatus} onChange={(event) => setUserStatus(event.target.value)} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                {['all', 'online', 'premium', 'admin', 'blocked', 'locked', 'free'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            )}
          >
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#25d366]/60"
              />
            </div>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user._id} className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{user.username}</p>
                        {user.role === 'admin' || user.isAdmin ? <Crown size={14} className="text-yellow-300" /> : null}
                      </div>
                      <p className="text-xs text-white/45 truncate">{user.phoneNumber || user.email || 'N/A'} - {formatDate(user.lastSeen)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton title="Activate premium" tone="green" onClick={() => activatePremium(user._id)}><UserCheck size={16} /></IconButton>
                      <IconButton title="Deactivate premium" tone="orange" onClick={() => deactivatePremium(user._id)}><UserX size={16} /></IconButton>
                      <IconButton title={user.isBlocked ? 'Unblock user' : 'Block user'} tone={user.isBlocked ? 'blue' : 'red'} onClick={() => setBlocked(user, !user.isBlocked)}>
                        {user.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                      </IconButton>
                      <IconButton title={user.role === 'admin' || user.isAdmin ? 'Demote admin' : 'Promote admin'} tone="neutral" onClick={() => setRole(user, !(user.role === 'admin' || user.isAdmin))}>
                        {user.role === 'admin' || user.isAdmin ? <Lock size={16} /> : <Crown size={16} />}
                      </IconButton>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="text-center py-8 text-sm text-white/40">No users found</div>}
            </div>
          </Panel>
        )}

        {activeTab === 'payments' && (
          <Panel
            icon={<CreditCard size={18} className="text-green-300" />}
            title="Payments"
            action={(
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs">
                {['all', 'completed', 'pending', 'failed', 'refunded'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            )}
          >
            <div className="space-y-2">
              {filteredPayments.map((payment) => (
                <div key={payment._id} className="rounded-lg bg-white/5 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{payment.phoneNumber || payment.userId}</p>
                    <p className="text-xs text-white/45 truncate">{payment.paymentMethod} - {formatDate(payment.updatedAt || payment.paymentDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-300">{formatMoney(payment.amount)}</p>
                    <p className="text-xs text-white/45">{payment.paymentStatus || payment.status}</p>
                  </div>
                </div>
              ))}
              {filteredPayments.length === 0 && <div className="text-center py-8 text-sm text-white/40">No payments found</div>}
            </div>
          </Panel>
        )}

        {activeTab === 'security' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={<Shield size={18} className="text-green-300" />} title="Security Posture">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(securityReport?.environment || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-white/5 p-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-white/55">{key}</span>
                    <StatusPill good={riskySecurityFlags.has(key) ? !value : Boolean(value)}>{String(value)}</StatusPill>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<AlertTriangle size={18} className="text-orange-300" />} title="Risk Watch">
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={<Lock size={18} />} label="Locked Accounts" value={securityReport?.lockedUsers?.length || 0} color="red" />
                <StatCard icon={<Ban size={18} />} label="Blocked Users" value={securityReport?.blockedUsers?.length || 0} color="orange" />
                <StatCard icon={<Shield size={18} />} label="Admins" value={securityReport?.adminUsers?.length || 0} color="green" />
                <StatCard icon={<AlertTriangle size={18} />} label="Failed Login Users" value={securityReport?.failedLoginUsers?.length || 0} color="purple" />
              </div>
            </Panel>

            <Panel icon={<ClipboardList size={18} className="text-blue-300" />} title="Recent Audit Logs">
              <div className="space-y-2">
                {auditLogs.slice(0, 12).map((log) => (
                  <div key={log._id} className="rounded-lg bg-white/5 p-3">
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className="text-xs text-white/45">{formatDate(log.timestamp)} - {log.ipAddress || 'unknown IP'}</p>
                  </div>
                ))}
                {auditLogs.length === 0 && <div className="text-center py-8 text-sm text-white/40">No audit logs yet</div>}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={<Server size={18} className="text-blue-300" />} title="Runtime">
              <div className="space-y-2">
                {[
                  ['Status', systemHealth?.status],
                  ['MongoDB', systemHealth?.services?.mongo],
                  ['Redis', systemHealth?.services?.redis],
                  ['Node', systemHealth?.runtime?.node],
                  ['Environment', systemHealth?.runtime?.environment],
                  ['Uptime Seconds', systemHealth?.uptimeSeconds]
                ].map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-white/5 p-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-white/55">{key}</span>
                    <span className="text-sm font-semibold text-white">{String(value ?? 'N/A')}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={<Database size={18} className="text-teal-300" />} title="Memory">
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<Database size={18} />} label="RSS MB" value={systemHealth?.runtime?.memoryMb?.rss || 0} color="teal" />
                <StatCard icon={<Database size={18} />} label="Heap Used" value={systemHealth?.runtime?.memoryMb?.heapUsed || 0} color="blue" />
                <StatCard icon={<Settings size={18} />} label="Heap Total" value={systemHealth?.runtime?.memoryMb?.heapTotal || 0} color="purple" />
              </div>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
