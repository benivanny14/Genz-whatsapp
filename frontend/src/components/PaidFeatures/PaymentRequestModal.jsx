import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, MessageCircle, DollarSign, Users, Check, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../../utils/authFetch';
import { resolveApiBase } from '../../utils/resolveApiBase';
import { useChat } from '../../context/ChatContext';
import { useUser } from '../../context/UserContext';

const API_URL = resolveApiBase();

const CURRENCIES = [
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
];

const PAYMENT_METHODS = [
  { id: 'mobile_money', label: 'Mobile Money' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'cash', label: 'Cash' },
];

const PaymentRequestModal = ({ conversation, onClose, onPaymentSent }) => {
  const { user } = useUser();
  const { contacts } = useChat();
  const [step, setStep] = useState('request'); // 'request' | 'sent' | 'success'
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const recipientName = conversation?.isGroup
    ? conversation?.name || 'Group'
    : conversation?.participants?.find(p => p._id !== user?._id)?.username || conversation?.name || 'Contact';

  const recipientId = conversation?.isGroup
    ? null
    : conversation?.participants?.find(p => p._id !== user?._id)?._id || conversation?.participants?.find(p => p._id !== user?._id || p.id !== user?.id)?._id;

  useEffect(() => {
    return () => {};
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) < 1) {
      setError('Please enter a valid amount');
      return;
    }
    if (!recipientId) {
      setError('No recipient selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authFetch(`${API_URL}/payments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          amount: Number(amount),
          currency,
          note: note.trim(),
          conversationId: conversation?._id || conversation?.id,
          paymentMethod
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setStep('success');
        onPaymentSent?.(data.request);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.message || 'Failed to send payment request');
      }
    } catch (error) {
      console.error('Payment request failed:', error);
      setError('Failed to send payment request');
    } finally {
      setLoading(false);
    }
  };

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = currencyInfo?.symbol || 'TSh';

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">TM WhatsApp Pay</h3>
              <p className="text-white/50 text-sm">{step === 'request' ? `Request from ${recipientName}` : 'Payment sent!'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {step === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-[#00a884]" />
              </div>
              <h4 className="text-white font-semibold text-lg mb-2">Payment Request Sent</h4>
              <p className="text-white/60 text-sm">
                {symbol} {Number(amount).toLocaleString()} sent to {recipientName}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/70 text-xs font-medium mb-1 block">Amount</label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="absolute left-0 top-0 bottom-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-l-lg text-white text-sm px-2 focus:outline-none"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-lg px-14 py-3 focus:outline-none focus:border-[#00a884] transition-colors"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                    {symbol}
                  </span>
                </div>
                {currencyInfo && (
                  <p className="text-white/50 text-[10px] mt-1">{currencyInfo.name}</p>
                )}
              </div>

              <div>
                <label className="text-white/70 text-xs font-medium mb-1 block">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What's this for?"
                  maxLength="500"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm px-3 py-2.5 focus:outline-none focus:border-[#00a884] transition-colors"
                />
              </div>

              <div>
                <label className="text-white/70 text-xs font-medium mb-1 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        paymentMethod === m.id
                          ? 'border-[#00a884] bg-[#00a884]/20 text-white'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] text-white/60 hover:bg-[#2a2a2a]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full bg-[#00a884] hover:bg-[#008069] disabled:bg-[#00a884]/40 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Request {symbol} {Number(amount || 0).toLocaleString()}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const PaymentRequestsPanel = ({ onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/payments/requests`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter(r => activeTab === 'pending' ? r.status === 'pending' : r.status === activeTab);

  const formatAmount = (amount, currency) => {
    const info = CURRENCIES.find(c => c.code === currency);
    return `${info?.symbol || ''}${Number(amount).toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <DollarSign size={20} className="text-[#00a884]" />
            TM WhatsApp Pay
          </h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1 p-3 border-b border-[#2a2a2a]">
          {['all', 'pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#00a884] text-white'
                  : 'bg-[#1a1a1a] text-white/60 hover:bg-[#2a2a2a]'
              }`}
            >
              {tab === 'all' ? 'All' : 'Pending'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-white/50 text-center py-8 text-sm">
              No payment requests
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {filtered.map(req => (
                <div key={req._id} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{req.requesterName} → You</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      req.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                    {req.status}
                  </span>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatAmount(req.amount, req.currency)}</div>
                  {req.note && <p className="text-white/70 text-sm mt-1">{req.note}</p>}
                  <div className="text-white/50 text-[10px] mt-2 flex items-center gap-1">
                    <Clock size={10} /> {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentRequestModal;
