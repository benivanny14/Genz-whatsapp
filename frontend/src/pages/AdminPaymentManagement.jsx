import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, Copy, Ban, UserCheck, Send, Loader2, X,
  Crown, Wallet, TrendingUp, Users as UsersIcon, CalendarClock
} from 'lucide-react';
import {
  listPayments, getStatistics, getPaymentDetails, approvePayment,
  rejectPayment, adminSendMessage, suspendUser, reactivateUser
} from '../services/manualPaymentService';

const TABS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'Duplicate', label: 'Duplicate' },
  { id: 'Expired', label: 'Expired' }
];

const STATUS_BADGE = {
  Pending: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  Approved: 'text-green-300 bg-green-500/10 border-green-500/30',
  Rejected: 'text-red-300 bg-red-500/10 border-red-500/30',
  Duplicate: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  Expired: 'text-gray-300 bg-gray-500/10 border-gray-500/30'
};

const fmtMoney = (n) => `Tsh ${Number(n || 0).toLocaleString('en-US')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

const StatCard = ({ icon, label, value, color }) => (
  <div className={`rounded-lg border p-3 ${color}`}>
    <div className="flex items-center gap-2 text-xs opacity-80 mb-1">{icon}{label}</div>
    <div className="text-xl font-black">{value ?? 0}</div>
  </div>
);

export default function AdminPaymentManagement() {
  const navigate = useNavigate();

  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(null);

  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listPayments({ status: tab, search, sortBy, sortDir, page, limit: 20 });
    if (res?.success) {
      setPayments(res.payments);
      setPagination(res.pagination);
    }
    setLoading(false);
  }, [tab, search, sortBy, sortDir, page]);

  const loadStats = useCallback(async () => {
    const res = await getStatistics();
    if (res?.success) setStats(res.stats);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleRefreshAll = () => { load(); loadStats(); };

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white pb-16">
      <header className="sticky top-0 z-40 bg-[#075e54] px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-white/10">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="font-black text-lg leading-tight">Payment Management</h1>
            <p className="text-xs text-green-100/80">Manual mobile money verification</p>
          </div>
        </div>
        <button onClick={handleRefreshAll} className="p-2 rounded-lg hover:bg-white/10">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Statistics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard icon={<Clock size={14} />} label="Pending" value={stats?.pendingPayments} color="border-yellow-500/30 text-yellow-300 bg-yellow-500/10" />
          <StatCard icon={<CalendarClock size={14} />} label="Today's Payments" value={stats?.todaysPayments} color="border-blue-500/30 text-blue-300 bg-blue-500/10" />
          <StatCard icon={<CheckCircle2 size={14} />} label="Approved" value={stats?.approvedPayments} color="border-green-500/30 text-green-300 bg-green-500/10" />
          <StatCard icon={<XCircle size={14} />} label="Rejected" value={stats?.rejectedPayments} color="border-red-500/30 text-red-300 bg-red-500/10" />
          <StatCard icon={<AlertTriangle size={14} />} label="Duplicate" value={stats?.duplicatePayments} color="border-orange-500/30 text-orange-300 bg-orange-500/10" />
          <StatCard icon={<Clock size={14} />} label="Expired Users" value={stats?.expiredUsers} color="border-gray-500/30 text-gray-300 bg-gray-500/10" />
          <StatCard icon={<Crown size={14} />} label="Active Subscribers" value={stats?.activeSubscribers} color="border-purple-500/30 text-purple-300 bg-purple-500/10" />
          <StatCard icon={<TrendingUp size={14} />} label="Monthly Revenue" value={fmtMoney(stats?.monthlyRevenue)} color="border-teal-500/30 text-teal-300 bg-teal-500/10" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                tab === t.id ? 'bg-[#25d366] text-[#071b16]' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, transaction ID, phone..."
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25d366]"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('username')}>User</th>
                <th className="p-3">Transaction ID</th>
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
                <th className="p-3">Operator</th>
                <th className="p-3 cursor-pointer" onClick={() => toggleSort('createdAt')}>Submitted</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={6} className="p-3"><div className="h-6 rounded bg-white/5 animate-pulse" /></td></tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-white/40">No payments in this category.</td></tr>
              ) : payments.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => setSelectedId(p._id)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                >
                  <td className="p-3 font-semibold">{p.username}</td>
                  <td className="p-3 font-mono text-xs">{p.transactionId}</td>
                  <td className="p-3">{fmtMoney(p.amount)}</td>
                  <td className="p-3 text-white/60">{p.parsed?.operator || 'Unknown'}</td>
                  <td className="p-3 text-white/60">{fmtDate(p.submittedAt)}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white/60">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
            <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

      {selectedId && (
        <PaymentDetailModal
          paymentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={handleRefreshAll}
        />
      )}
    </div>
  );
}

function PaymentDetailModal({ paymentId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getPaymentDetails(paymentId);
    if (res?.success) setData(res);
    setLoading(false);
  }, [paymentId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setBusy(true);
    const res = await approvePayment(paymentId);
    setBusy(false);
    setActionMsg(res?.message || '');
    if (res?.success) { load(); onChanged(); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    const res = await rejectPayment(paymentId, rejectReason.trim());
    setBusy(false);
    setActionMsg(res?.message || '');
    if (res?.success) { setShowReject(false); setRejectReason(''); load(); onChanged(); }
  };

  const handleSuspend = async () => {
    setBusy(true);
    await suspendUser(data.user._id);
    setBusy(false);
    load();
  };

  const handleReactivate = async () => {
    setBusy(true);
    await reactivateUser(data.user._id);
    setBusy(false);
    load();
  };

  const handleSendMessage = async () => {
    if (!messageDraft.trim()) return;
    setBusy(true);
    const res = await adminSendMessage(paymentId, messageDraft.trim());
    setBusy(false);
    if (res?.success) { setMessageDraft(''); load(); }
  };

  const copyTxnId = () => {
    if (data?.payment?.transactionId) navigator.clipboard?.writeText(data.payment.transactionId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-[#0d1b2a] border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#075e54] flex items-center justify-between p-4 z-10">
          <h3 className="font-bold">Payment Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
        </div>

        {loading || !data ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded bg-white/5 animate-pulse" />)}
          </div>
        ) : (
          <div className="p-4 space-y-4 text-sm">
            {actionMsg && (
              <div className="rounded-lg border border-white/10 bg-white/10 p-2.5 text-xs">{actionMsg}</div>
            )}

            {data.payment.status === 'Duplicate' && data.duplicateOf && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-orange-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1"><AlertTriangle size={14} /> Duplicate Transaction ID</p>
                <p>This transaction ID was first used by <strong>{data.duplicateOf.username}</strong> on {fmtDate(data.duplicateOf.submittedAt)} (payment {String(data.duplicateOf._id).slice(-6)}, status: {data.duplicateOf.status}).</p>
              </div>
            )}

            {/* User summary */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {data.user?.profilePicture ? (
                    <img src={data.user.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : <UsersIcon size={20} className="text-white/40" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{data.user?.username}</p>
                  <p className="text-xs text-white/50 truncate">{data.user?.email || 'No email'} · {data.user?.phoneNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 text-white/60">
                <p>Registered: {fmtDate(data.user?.createdAt)}</p>
                <p>Last seen: {fmtDate(data.user?.lastSeen)}</p>
                <p>Status: {data.user?.isBlocked ? <span className="text-red-300">Suspended</span> : <span className="text-green-300">Active</span>}</p>
                <p>Premium: {data.user?.premium ? <span className="text-green-300">Yes, until {fmtDate(data.user?.subscriptionExpiresAt)}</span> : 'No'}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                <div className="rounded bg-white/5 p-1.5"><p className="font-bold">{data.stats.totalPayments}</p><p className="text-white/40">Total</p></div>
                <div className="rounded bg-white/5 p-1.5"><p className="font-bold text-green-300">{data.stats.approvedPayments}</p><p className="text-white/40">Approved</p></div>
                <div className="rounded bg-white/5 p-1.5"><p className="font-bold text-red-300">{data.stats.rejectedPayments}</p><p className="text-white/40">Rejected</p></div>
                <div className="rounded bg-white/5 p-1.5"><p className="font-bold text-orange-300">{data.stats.duplicatePayments}</p><p className="text-white/40">Duplicate</p></div>
              </div>
            </div>

            {/* Current payment */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold">Current Payment</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_BADGE[data.payment.status]}`}>{data.payment.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Amount: <strong>{fmtMoney(data.payment.amount)}</strong></p>
                <p className="flex items-center gap-1">Txn ID: <strong className="font-mono">{data.payment.transactionId}</strong>
                  <button onClick={copyTxnId} className="text-white/40 hover:text-white"><Copy size={12} /></button>
                </p>
                <p>Operator: {data.payment.parsed?.operator}</p>
                <p>Submitted: {fmtDate(data.payment.submittedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Full SMS as submitted:</p>
                <div className="rounded bg-[#0d1b2a] border border-white/10 p-2 text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {data.payment.paymentSMS}
                </div>
              </div>
              {data.payment.rejectedReason && (
                <p className="text-xs text-red-300">Rejected reason: {data.payment.rejectedReason}</p>
              )}
            </div>

            {/* Approval history */}
            {data.payment.approvalHistory?.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="font-bold mb-2 text-xs">Approval History</p>
                <div className="space-y-1 text-xs text-white/60">
                  {data.payment.approvalHistory.map((h, i) => (
                    <p key={i}>{h.action} {h.byUsername ? `by ${h.byUsername}` : ''} — {fmtDate(h.at)} {h.reason ? `(${h.reason})` : ''}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {data.payment.status !== 'Approved' && (
                <button disabled={busy || data.payment.status === 'Duplicate'} onClick={handleApprove} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 disabled:opacity-40 text-white text-xs font-semibold">
                  <CheckCircle2 size={14} /> Approve
                </button>
              )}
              {data.payment.status !== 'Rejected' && (
                <button disabled={busy} onClick={() => setShowReject((s) => !s)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600 disabled:opacity-40 text-white text-xs font-semibold">
                  <XCircle size={14} /> Reject
                </button>
              )}
              {data.user?.isBlocked ? (
                <button disabled={busy} onClick={handleReactivate} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                  <UserCheck size={14} /> Reactivate User
                </button>
              ) : (
                <button disabled={busy} onClick={handleSuspend} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold">
                  <Ban size={14} /> Suspend User
                </button>
              )}
            </div>

            {showReject && (
              <div className="flex gap-2">
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs"
                />
                <button disabled={busy} onClick={handleReject} className="px-3 py-2 rounded-lg bg-red-600 text-xs font-semibold">Confirm</button>
              </div>
            )}

            {/* Conversation */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <p className="font-bold text-xs">Conversation</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(data.payment.conversation || []).length === 0 ? (
                  <p className="text-xs text-white/30">No messages yet.</p>
                ) : data.payment.conversation.map((m) => (
                  <div key={m._id} className={`text-xs rounded-lg p-2 max-w-[80%] ${m.sender === 'admin' ? 'bg-[#25d366]/15 text-green-100 ml-auto' : 'bg-white/10 text-white/80'}`}>
                    <p className="font-semibold mb-0.5">{m.sender === 'admin' ? 'Admin' : data.user?.username}</p>
                    <p>{m.message}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{fmtDate(m.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Message the user..."
                  className="flex-1 rounded-lg bg-[#0d1b2a] border border-white/10 px-3 py-2 text-xs"
                />
                <button disabled={busy} onClick={handleSendMessage} className="px-3 py-2 rounded-lg bg-[#25d366] text-[#071b16] text-xs font-semibold flex items-center gap-1">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
