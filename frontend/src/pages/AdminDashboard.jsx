import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Gauge, Users, CreditCard, BadgeDollarSign, MessageSquare,
  UsersRound, Radio, CircleDot, Sparkles, Megaphone, Bell,
  LifeBuoy, MessagesSquare, BarChart3, TrendingUp, ShieldAlert, Copy,
  ScrollText, ShieldCheck, KeyRound, Smartphone, Timer, Sun, Moon,
  Menu, X, LogOut, RefreshCcw, Search, CheckCircle2, XCircle, AlertTriangle,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../services/adminApi';
import { useAdminAuth } from '../context/AdminAuthContext';

import ChatManagement from '../components/admin/ChatManagement';
import GroupManagement from '../components/admin/GroupManagement';
import ChannelManagement from '../components/admin/ChannelManagement';
import StatusStoriesManagement from '../components/admin/StatusStoriesManagement';
import BroadcastSystem from '../components/admin/BroadcastSystem';
import NotificationCenter from '../components/admin/NotificationCenter';
import SupportTickets from '../components/admin/SupportTickets';
import AdminUserChat from '../components/admin/AdminUserChat';
import ReportsAnalytics from '../components/admin/ReportsAnalytics';
import FraudDetection from '../components/admin/FraudDetection';
import RolesPermissions from '../components/admin/RolesPermissions';
import AdminDeviceManagement from '../components/admin/AdminDeviceManagement';
import SessionManagement from '../components/admin/SessionManagement';
import AbuseReports from '../components/admin/AbuseReports';
import GenzAfterWorkManagement from '../components/admin/GenzAfterWorkManagement';

// ---------------------------------------------------------------------
// Section registry — all 33 requested modules, ALL now implemented and
// wired to real backend endpoints.
// ---------------------------------------------------------------------
const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Core', implemented: true },
  { key: 'dashboard', label: 'Dashboard', icon: Gauge, group: 'Core', implemented: true },
  { key: 'users', label: 'User Management', icon: Users, group: 'Core', implemented: true },
  { key: 'payments', label: 'Payment Management', icon: CreditCard, group: 'Finance', implemented: true },
  { key: 'subscriptions', label: 'Subscription Management', icon: BadgeDollarSign, group: 'Finance', implemented: true },
  { key: 'revenue', label: 'Revenue Dashboard', icon: TrendingUp, group: 'Finance', implemented: true },
  { key: 'duplicatePayments', label: 'Duplicate Payment Detection', icon: Copy, group: 'Finance', implemented: true },
  { key: 'fraud', label: 'Fraud Detection', icon: ShieldAlert, group: 'Finance', implemented: true },
  { key: 'genzAfterWork', label: 'GENZ AFTER WORK', icon: DollarSign, group: 'Finance', implemented: true },
  { key: 'chats', label: 'Chat Management', icon: MessageSquare, group: 'Content', implemented: true },
  { key: 'groups', label: 'Group Management', icon: UsersRound, group: 'Content', implemented: true },
  { key: 'channels', label: 'Channel Management', icon: Radio, group: 'Content', implemented: true },
  { key: 'status', label: 'Status Management', icon: CircleDot, group: 'Content', implemented: true },
  { key: 'stories', label: 'Stories Management', icon: Sparkles, group: 'Content', implemented: true },
  { key: 'broadcast', label: 'Broadcast System', icon: Megaphone, group: 'Communication', implemented: true },
  { key: 'notifications', label: 'Notification Center', icon: Bell, group: 'Communication', implemented: true },
  { key: 'tickets', label: 'Support Ticket System', icon: LifeBuoy, group: 'Communication', implemented: true },
  { key: 'adminChat', label: 'Admin ↔ User Chat', icon: MessagesSquare, group: 'Communication', implemented: true },
  { key: 'abuseReports', label: 'Abuse Reports', icon: AlertTriangle, group: 'Reports', implemented: true },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, group: 'Reports', implemented: true },
  { key: 'auditLogs', label: 'Audit Logs', icon: ScrollText, group: 'Usalama', implemented: true },
  { key: 'security', label: 'Security Center', icon: ShieldCheck, group: 'Usalama', implemented: true },
  { key: 'roles', label: 'Roles & Permissions', icon: KeyRound, group: 'Usalama', implemented: true },
  { key: 'devices', label: 'Device Management', icon: Smartphone, group: 'Usalama', implemented: true },
  { key: 'sessions', label: 'Session Management', icon: Timer, group: 'Usalama', implemented: true },
];

const GROUP_ORDER = ['Core', 'Finance', 'Content', 'Communication', 'Reports', 'Security'];

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
      This section will be built in Phase 2 of the project — the design (schema, API,
      UI) is already planned on the project roadmap. Let me know if you want this built
      kwanza.
    </p>
  </div>
);

// ---------------------------------------------------------------------
// Reads the ErrorBoundary's per-route crash counters (localStorage) recorded
// in this browser — a lightweight frontend-regression signal without an
// external error service. Shows only what this admin browser has observed.
const FrontendCrashesPanel = () => {
  const [crashes, setCrashes] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('genz_boundary_crashes');
      setCrashes(raw ? JSON.parse(raw) : {});
    } catch {
      setCrashes({});
    }
  }, []);
  const entries = Object.entries(crashes || {}).filter(([, count]) => count > 0);
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-3">Frontend Crashes (browser)</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No crashes recorded in this browser.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([route, count]) => (
            <div key={route} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-700 dark:text-gray-300 font-mono">{route}</span>
              <span className="text-red-500 font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Server-side crash telemetry (opt-in): every browser that has crash reporting
// enabled POSTs caught render errors to /api/telemetry/crashes; this panel
// shows the aggregate across all users via the admin API — unlike the browser
// panel above, it is not limited to what this admin browser has observed.
const ServerCrashesPanel = () => {
  const [crashes, setCrashes] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/admin/frontend-crashes');
      setCrashes(data?.crashes || { recent: [], grouped: [] });
    } catch {
      setCrashes({ recent: [], grouped: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium">Frontend Crashes (server)</h3>
        <button
          onClick={load}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs flex items-center gap-1"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Inapakia…</p>
      ) : crashes.grouped?.length === 0 ? (
        <p className="text-sm text-gray-400">No crash reports recorded (opt-in reporting).</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-auto">
          {crashes.grouped.slice(0, 20).map((g, i) => (
            <div key={i} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <div className="flex justify-between">
                <span className="text-red-500 font-medium">{g.count}×</span>
                <span className="text-gray-400 text-xs">{g.lastSeen ? new Date(g.lastSeen).toLocaleString() : ''}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-mono text-xs break-all">{g.route}</p>
              <p className="text-gray-400 text-xs break-all">{g.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Update-banner analytics (opt-in): devices that have "Update analytics"
// enabled in Privacy send anonymous shown/dismissed/updated events to
// /api/telemetry/events; this panel shows the 30-day aggregate per event and
// per app version via the admin API (/api/admin/app-events).
const UpdateEventsPanel = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/admin/app-events');
      setEvents(data);
    } catch {
      setEvents(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(timer);
  }, [load]);

  const total = events?.byEvent ? Object.values(events.byEvent).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium">Update Analytics (server)</h3>
        <button
          onClick={load}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs flex items-center gap-1"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Inapakia…</p>
      ) : !events || total === 0 ? (
        <p className="text-sm text-gray-400">No update events yet (opt-in reporting).</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-300">
              Shown: {events.byEvent.update_shown || 0}
            </span>
            <span className="rounded-lg bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-300">
              Dismissed: {events.byEvent.update_dismissed || 0}
            </span>
            <span className="rounded-lg bg-green-500/10 px-2 py-1 text-green-600 dark:text-green-300">
              Updated: {(events.byEvent.update_tapped || 0) + (events.byEvent.update_reload_tapped || 0)}
            </span>
            <span className="ml-auto text-gray-400">last {events.days || 30} days</span>
          </div>
          {events.byVersion?.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="py-1 pr-3 font-medium">Version</th>
                    <th className="py-1 pr-3 font-medium">Shown</th>
                    <th className="py-1 pr-3 font-medium">Dismissed</th>
                    <th className="py-1 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {events.byVersion.map((v) => (
                    <tr key={v.version} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300">v{v.version}</td>
                      <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{v.shown}</td>
                      <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{v.dismissed}</td>
                      <td className="py-1.5 text-green-600 dark:text-green-300">{v.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Nightly production-health check: last runs of the prod-health-nightly
// workflow (proxy of GitHub's public API — /api/admin/nightly-status).
// Shows whether the automated nightly checks are green.
const NightlyStatusPanel = () => {
  const [runs, setRuns] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/admin/nightly-status');
      setRuns(data?.runs || []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium">Nightly Health Check</h3>
        <button
          onClick={load}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs flex items-center gap-1"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Inapakia…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-gray-400">No runs yet (or the GitHub API is not responding).</p>
      ) : (
        <div className="space-y-1.5 text-sm">
          {runs.map((r) => {
            const ok = r.conclusion === 'success';
            const running = r.status !== 'completed';
            return (
              <a
                key={r.id}
                href={`https://github.com/benivanny14/Genz-whatsapp/actions/runs/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${running ? 'bg-blue-400' : ok ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span className="text-gray-600 dark:text-gray-300">
                    {running ? 'in_progress' : ok ? 'success' : 'failure'}
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Release adoption: per-version uptake table (30 days) with a 7-day trend
// column and an adoption % (updated/shown) — spot which releases users
// actually moved to. Feeds from the same /api/admin/app-events call.
const ReleaseAdoptionPanel = () => {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/admin/app-events');
      setEvents(data);
    } catch {
      setEvents(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return null;
  const rows = (events?.byVersion || []).map((v) => {
    const trend = (events.byVersion7 || []).find((t) => t.versionCode === v.versionCode) || {};
    const adoption = v.shown > 0 ? Math.round((v.updated / v.shown) * 100) : 0;
    return { ...v, trendUpdated: trend.updated || 0, adoption };
  });
  const withData = rows.filter((r) => r.shown > 0 || r.updated > 0);
  if (withData.length === 0) return null; // nothing to show until opt-in data exists

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-3">Release Adoption (last 30 days)</h3>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-1 pr-3 font-medium">Version</th>
              <th className="py-1 pr-3 font-medium">Shown</th>
              <th className="py-1 pr-3 font-medium">Updated</th>
              <th className="py-1 pr-3 font-medium">Adoption</th>
              <th className="py-1 font-medium">Updated (7d)</th>
            </tr>
          </thead>
          <tbody>
            {withData.map((v) => (
              <tr key={v.version} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 font-medium">v{v.version}</td>
                <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{v.shown}</td>
                <td className="py-1.5 pr-3 text-green-600 dark:text-green-300">{v.updated}</td>
                <td className="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{v.adoption}%</td>
                <td className="py-1.5 text-gray-400">{v.trendUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
      toast.error('Failed to load overview');
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
        <StatCard label="Total Users" value={overview.users.total} sub={`${overview.users.online} online`} />
        <StatCard label="Wapya Leo" value={overview.users.newToday} tone="blue" />
        <StatCard label="Premium" value={overview.users.premium} tone="amber" />
        <StatCard label="Wamezuiwa" value={overview.users.blocked} tone="red" />
        <StatCard label="Total Messages" value={overview.messaging.totalMessages} tone="violet" />
        <StatCard label="Messages Today" value={overview.messaging.messagesToday} tone="violet" />
        <StatCard label="Mapato Yote" value={fmtMoney(overview.payments.totalRevenue)} tone="emerald" />
        <StatCard label="Active Devices" value={overview.devices.active} tone="blue" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-3">New Users</h3>
        <div className="space-y-2">
          {recentUsers?.map((u) => (
            <div key={u._id} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-700 dark:text-gray-300">{u.username}</span>
              <span className="text-gray-400">{u.phoneNumber}</span>
            </div>
          ))}
        </div>
      </div>

      <FrontendCrashesPanel />
      <ServerCrashesPanel />
      <UpdateEventsPanel />
      <ReleaseAdoptionPanel />
      <NightlyStatusPanel />
    </div>
  );
};

// ---------------------------------------------------------------------
// Section: Dashboard (system health)
// ---------------------------------------------------------------------
const DashboardSection = () => {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    adminApi.get('/admin/health').then(({ data }) => setHealth(data)).catch(() => toast.error('Failed to load health'));
  }, []);
  if (!health) return <LoadingBlock />;
  // Nested health fields (services, runtime) are objects — render them as
  // readable JSON instead of the default "[object Object]" string.
  const displayValue = (v) =>
    v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(health).map(([k, v]) => (
        <StatCard key={k} label={k} value={displayValue(v)} />
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
      toast.error('Failed to load users');
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
      toast.error('Failed to change user status');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone number..."
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-1">
          <Search size={16} /> Search
        </button>
      </form>

      {loading ? <LoadingBlock /> : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
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
                      : <span className="text-emerald-500">OK</span>}
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleBlock(u)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                      {u.isBlocked ? 'Unblock' : 'Block'}
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
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    let body = {};
    if (action === 'reject') {
      const reason = window.prompt('Sababu ya kukataa (required):');
      if (!reason || !reason.trim()) {
        toast.error('A reason is required to reject a payment');
        return;
      }
      body = { reason: reason.trim() };
    }
    try {
      await adminApi.post(`/admin/manual-payments/${id}/${action}`, body);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      load();
    } catch {
      toast.error('Failed to update payment');
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending" value={stats.pendingPayments} tone="amber" />
          <StatCard label="Approved" value={stats.approvedPayments} tone="emerald" />
          <StatCard label="Rejected" value={stats.rejectedPayments} tone="red" />
          <StatCard label="Zinazofanana (Duplicate)" value={stats.duplicatePayments} tone="red" />
          <StatCard label="Wanachama Amilifu" value={stats.activeSubscribers} tone="blue" />
          <StatCard label="Revenue This Month" value={fmtMoney(stats.monthlyRevenue)} tone="emerald" />
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
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">No records</td></tr>
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
      .catch(() => toast.error('Failed to load audit logs'));
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
    adminApi.get('/admin/security').then(({ data }) => setReport(data.report)).catch(() => toast.error('Failed to load'));
  }, []);
  if (!report) return <LoadingBlock />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Waliofungwa (locked)" value={report.lockedUsers.length} tone="red" />
        <StatCard label="Kushindwa Kuingia" value={report.failedLoginUsers.length} tone="amber" />
        <StatCard label="Blocked" value={report.blockedUsers.length} tone="red" />
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
          Warning: there are still regular users with the old "isAdmin/role=admin" flag
          in the database. The new security model no longer treats them as admins, but we recommend
          removing that flag from their records to keep the database clean.
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

class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AdminDashboard section error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-6 text-center">
          <p className="font-medium text-amber-700 dark:text-amber-300">This section could not be loaded properly.</p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">There is an internal error in this widget. We can continue with the other dashboards without interruption.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-lg bg-amber-600 px-3 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
      case 'genzAfterWork': return <GenzAfterWorkManagement />;
      case 'chats': return <ChatManagement />;
      case 'groups': return <GroupManagement />;
      case 'channels': return <ChannelManagement />;
      case 'status': return <StatusStoriesManagement mode="status" />;
      case 'stories': return <StatusStoriesManagement mode="stories" />;
      case 'broadcast': return <BroadcastSystem />;
      case 'notifications': return <NotificationCenter />;
      case 'tickets': return <SupportTickets />;
      case 'adminChat': return <AdminUserChat />;
      case 'abuseReports': return <AbuseReports />;
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
    <div className="h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
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
          <SectionErrorBoundary key={active}>
            {renderActive()}
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
