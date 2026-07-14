import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Crown, Copy, CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, Phone, User as UserIcon, Send, MessageCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getPaymentInfo, previewSms, submitPayment, getMyPayments, sendUserReply
} from '../services/manualPaymentService';

const STATUS_META = {
  Pending: { color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30', icon: Clock, label: 'Pending review' },
  Approved: { color: 'text-green-300 bg-green-500/10 border-green-500/30', icon: CheckCircle2, label: 'Approved' },
  Rejected: { color: 'text-red-300 bg-red-500/10 border-red-500/30', icon: XCircle, label: 'Rejected' },
  Duplicate: { color: 'text-orange-300 bg-orange-500/10 border-orange-500/30', icon: AlertTriangle, label: 'Duplicate - under review' },
  Expired: { color: 'text-gray-300 bg-gray-500/10 border-gray-500/30', icon: Clock, label: 'Expired' }
};

const fmtMoney = (n, currency = 'TZS') => `${currency} ${Number(n || 0).toLocaleString('en-US')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');

export default function SubscriptionPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [info, setInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [sms, setSms] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [txnManuallyEdited, setTxnManuallyEdited] = useState(false);
  const [amountManuallyEdited, setAmountManuallyEdited] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sendingReply, setSendingReply] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPaymentInfo();
        if (res?.success) setInfo(res);
        else console.error('Payment info API failed:', res);
      } catch (error) {
        console.error('Error fetching payment info:', error);
      } finally {
        setLoadingInfo(false);
      }
    })();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const res = await getMyPayments();
    if (res?.success) setHistory(res.payments);
    setLoadingHistory(false);
  };

  // Debounced auto-parse as the user pastes/types the SMS
  useEffect(() => {
    if (!sms.trim()) {
      setParsed(null);
      return;
    }
    setParsing(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await previewSms(sms);
      if (res?.success) {
        setParsed(res.parsed);
        if (!txnManuallyEdited && res.parsed.transactionId) setTransactionId(res.parsed.transactionId);
        if (!amountManuallyEdited && res.parsed.amount) setAmount(String(res.parsed.amount));
      }
      setParsing(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sms]);

  const canSubmit = useMemo(() => {
    return sms.trim().length > 0 && transactionId.trim().length >= 6 && Number(amount) > 0 && !submitting;
  }, [sms, transactionId, amount, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setDuplicateWarning(null);

    if (!sms.trim()) return setFormError('Please paste your payment confirmation SMS.');
    if (!transactionId.trim() || transactionId.trim().length < 6) {
      return setFormError('Transaction ID is missing or invalid. Please check the SMS or enter it manually.');
    }
    if (!amount || Number(amount) <= 0) {
      return setFormError('Amount paid is missing or invalid. Please check the SMS or enter it manually.');
    }

    setSubmitting(true);
    const res = await submitPayment({ sms, transactionId: transactionId.trim(), amount: Number(amount) });
    setSubmitting(false);

    if (!res?.success) {
      setFormError(res?.message || 'Failed to submit payment.');
      return;
    }

    if (res.payment?.status === 'Duplicate') {
      setDuplicateWarning(res.message);
    } else {
      setSuccessMsg(res.message);
    }

    setSms('');
    setTransactionId('');
    setAmount('');
    setParsed(null);
    setTxnManuallyEdited(false);
    setAmountManuallyEdited(false);
    loadHistory();
  };

  const handleReply = async (paymentId) => {
    const message = (replyDrafts[paymentId] || '').trim();
    if (!message) return;
    setSendingReply(paymentId);
    const res = await sendUserReply(paymentId, message);
    setSendingReply(null);
    if (res?.success) {
      setReplyDrafts((d) => ({ ...d, [paymentId]: '' }));
      loadHistory();
    }
  };

  const copyReceiver = () => {
    if (info?.receiverNumber) navigator.clipboard?.writeText(info.receiverNumber);
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-white pb-16">
      <header className="sticky top-0 z-40 bg-[#075e54] px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <Crown size={20} />
        </div>
        <div>
          <h1 className="font-black text-lg leading-tight">Subscription Payment</h1>
          <p className="text-xs text-green-100/80">Pay via mobile money &amp; submit for verification</p>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-5 max-w-xl mx-auto">
        {/* Plan + payment details card */}
        {loadingInfo ? (
          <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/50">Subscription</p>
                <p className="font-bold text-lg">{info?.plan?.name || 'Premium'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50">Price</p>
                <p className="font-bold text-lg text-[#25d366]">{fmtMoney(info?.plan?.amount || 10000, 'TZS')}</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#0d1b2a] border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Phone size={14} /> Payment phone number
                </div>
                <button onClick={copyReceiver} className="flex items-center gap-1 font-mono font-bold text-white">
                  {info?.receiverNumber || '0639533428'} <Copy size={13} className="text-white/40" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <UserIcon size={14} /> Receiver name
                </div>
                <span className="font-semibold">{info?.receiverName || 'ERASTOR GODFREY PAUL'}</span>
              </div>
            </div>

            <div className="space-y-1 text-sm text-white/70">
              {info?.instructions?.length ? info.instructions.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#25d366] font-bold">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              )) : (
                <>
                  <div className="flex gap-2">
                    <span className="text-[#25d366] font-bold">1.</span>
                    <span>Send payment to {info?.receiverNumber || '0639533428'} ({info?.receiverName || 'ERASTOR GODFREY PAUL'}).</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#25d366] font-bold">2.</span>
                    <span>Copy the entire confirmation SMS you receive.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#25d366] font-bold">3.</span>
                    <span>Paste the SMS below.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#25d366] font-bold">4.</span>
                    <span>Submit for verification.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Submission form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div>
            <label className="text-sm font-semibold text-white/80 mb-1 block">
              Paste your payment confirmation SMS here
            </label>
            <textarea
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              rows={6}
              placeholder="Paste the SMS you received after paying. Example: QGH7K8J9L0 Confirmed. Tsh10,000.00 received from JOHN DOE 255712345678 on 12/7/26 at 3:45 PM."
              className="w-full rounded-lg bg-[#0d1b2a] border border-white/10 p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#25d366] resize-y"
            />
            {parsing && (
              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Reading SMS…
              </p>
            )}
            {!parsing && parsed && (
              <p className={`text-xs mt-1 ${parsed.confidence === 'high' ? 'text-green-400' : 'text-yellow-400'}`}>
                {parsed.confidence === 'high'
                  ? `Detected ${parsed.operator} payment automatically.`
                  : 'Could not fully auto-detect this SMS format — please check the fields below.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-white/80 mb-1 block">Transaction ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => { setTransactionId(e.target.value.toUpperCase()); setTxnManuallyEdited(true); }}
                placeholder="e.g. QGH7K8J9L0"
                className="w-full rounded-lg bg-[#0d1b2a] border border-white/10 p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25d366]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-white/80 mb-1 block">Amount Paid (TZS)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAmountManuallyEdited(true); }}
                placeholder="e.g. 10000"
                className="w-full rounded-lg bg-[#0d1b2a] border border-white/10 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25d366]"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3 flex gap-2">
              <XCircle size={16} className="shrink-0 mt-0.5" /> {formError}
            </div>
          )}
          {duplicateWarning && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-300 text-sm p-3 flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {duplicateWarning}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-sm p-3 flex gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-[#25d366] disabled:bg-white/10 disabled:text-white/30 text-[#071b16] font-bold py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Submit Payment
          </button>
        </form>

        {/* Payment history */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white/80">My Payment Requests</h2>
            <button onClick={loadHistory} className="text-white/40 hover:text-white p-1">
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No payment requests yet.</p>
          ) : (
            history.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.Pending;
              const Icon = meta.icon;
              const isOpen = expandedId === p._id;
              return (
                <div key={p._id} className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : p._id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div>
                      <p className="font-semibold text-sm">{fmtMoney(p.amount, p.currency)}</p>
                      <p className="text-xs text-white/40 font-mono">{p.transactionId} · {fmtDate(p.submittedAt)}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${meta.color}`}>
                      <Icon size={12} /> {meta.label}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 space-y-3 border-t border-white/10 pt-3">
                      {p.status === 'Rejected' && p.rejectedReason && (
                        <p className="text-xs text-red-300">Reason: {p.rejectedReason}</p>
                      )}
                      {p.status === 'Approved' && p.expiresAt && (
                        <p className="text-xs text-green-300">Active until {fmtDate(p.expiresAt)}</p>
                      )}

                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {(p.conversation || []).length === 0 ? (
                          <p className="text-xs text-white/30 flex items-center gap-1"><MessageCircle size={12} /> No messages yet.</p>
                        ) : p.conversation.map((m) => (
                          <div key={m._id} className={`text-xs rounded-lg p-2 max-w-[80%] ${m.sender === 'admin' ? 'bg-[#25d366]/15 text-green-100 ml-auto' : 'bg-white/10 text-white/80'}`}>
                            <p className="font-semibold mb-0.5">{m.sender === 'admin' ? 'Admin' : 'You'}</p>
                            <p>{m.message}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">{fmtDate(m.createdAt)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={replyDrafts[p._id] || ''}
                          onChange={(e) => setReplyDrafts((d) => ({ ...d, [p._id]: e.target.value }))}
                          placeholder="Reply to admin..."
                          className="flex-1 rounded-lg bg-[#0d1b2a] border border-white/10 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#25d366]"
                        />
                        <button
                          onClick={() => handleReply(p._id)}
                          disabled={sendingReply === p._id}
                          className="rounded-lg bg-[#25d366] text-[#071b16] px-3 py-2 font-semibold text-xs"
                        >
                          {sendingReply === p._id ? <Loader2 size={14} className="animate-spin" /> : 'Send'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
