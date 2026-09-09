import React, { useState, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Support() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data.tickets || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.post('/support/tickets', { subject: subject.trim(), message: message.trim() });
      toast.success('Ticket sent');
      setSubject(''); setMessage(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/10"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 mb-6">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-sm" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue..." rows={4} className="w-full bg-[#0b141a] border border-white/10 rounded-lg px-3 py-2 text-sm" />
        <button disabled={sending} className="w-full bg-[#00a884] text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">{sending ? 'Sending...' : 'Send Ticket'}</button>
      </form>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">My Tickets</h2>
        {tickets.length === 0 ? <p className="text-sm text-white/40">No tickets yet.</p> : tickets.map(t => (
          <div key={t._id} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="font-semibold text-sm">{t.subject}</p>
            <p className="text-xs text-white/50">{t.status} • {new Date(t.updatedAt).toLocaleString()}</p>
            <div className="mt-2 space-y-1">
              {t.conversation?.slice(-3).map((m, i) => (
                <p key={i} className={`text-xs p-2 rounded ${m.sender==='admin' ? 'bg-blue-500/20' : 'bg-white/10'}`}>{m.message}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
