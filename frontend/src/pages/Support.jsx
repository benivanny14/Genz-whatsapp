import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'account', label: 'Account Issue' },
  { value: 'other', label: 'Other' },
];

export default function Support() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [tickets, setTickets] = useState([]);
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(null);
  const replyEndRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data.tickets || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  // Live refresh when admin sends a message via socket
  useEffect(() => {
    const onTicketUpdated = () => { load(); };
    window.addEventListener('ticket:updated', onTicketUpdated);
    return () => window.removeEventListener('ticket:updated', onTicketUpdated);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.post('/support/tickets', { subject: subject.trim(), message: message.trim(), category });
      toast.success('Ticket sent');
      setSubject(''); setMessage(''); setCategory('general'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const handleReply = async (ticketId) => {
    if (!replyText.trim()) return;
    setReplying(ticketId);
    try {
      const { data } = await api.post(`/support/tickets/${ticketId}/reply`, { message: replyText.trim() });
      toast.success('Reply sent');
      setReplyText('');
      setTickets(prev => prev.map(t => t._id === ticketId ? data.ticket : t));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reply'); }
    finally { setReplying(null); }
  };

  const toggleExpand = async (ticketId) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      return;
    }
    setLoadingTicket(ticketId);
    try {
      const { data } = await api.get(`/support/tickets/${ticketId}`);
      setTickets(prev => prev.map(t => t._id === ticketId ? data.ticket : t));
    } catch {}
    setLoadingTicket(null);
    setExpandedId(ticketId);
    setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const statusColor = (s) => {
    if (s === 'open') return 'text-green-400 bg-green-500/10';
    if (s === 'resolved') return 'text-blue-400 bg-blue-500/10';
    if (s === 'closed') return 'text-gray-400 bg-gray-500/10';
    return 'text-yellow-400 bg-yellow-500/10';
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-6">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-sm">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-sm" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue..." rows={4} className="w-full bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-sm" />
        <button disabled={sending} className="w-full bg-[#00a884] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{sending ? 'Sending...' : 'Send Ticket'}</button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">My Tickets</h2>
        {tickets.length === 0 ? <p className="text-sm text-white/40">No tickets yet.</p> : tickets.map(t => (
          <div key={t._id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => toggleExpand(t._id)} className="w-full text-left p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                  {t.category && <span className="text-xs text-white/40">{t.category}</span>}
                  <span className="text-xs text-white/40">{new Date(t.updatedAt).toLocaleString()}</span>
                </div>
              </div>
              {expandedId === t._id ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
            </button>

            {expandedId === t._id && (
              <div className="border-t border-white/10 p-3 space-y-3">
                {loadingTicket === t._id ? (
                  <p className="text-xs text-white/40">Loading...</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {t.conversation?.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] text-xs p-2 rounded-lg ${m.sender === 'admin' ? 'bg-blue-500/20 text-blue-200' : 'bg-[#00a884]/20 text-green-200'}`}>
                            <p>{m.message}</p>
                            <p className="text-[10px] opacity-50 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={replyEndRef} />
                    </div>
                    {t.status !== 'closed' && (
                      <div className="flex gap-2">
                        <input value={expandedId === t._id ? replyText : ''} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a reply..." className="flex-1 bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-xs" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(t._id); } }} />
                        <button onClick={() => handleReply(t._id)} disabled={replying === t._id || !replyText.trim()} className="bg-[#00a884] text-white px-3 py-2 rounded-lg disabled:opacity-50"><Send size={14} /></button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
