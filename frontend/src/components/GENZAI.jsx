import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, Bot, User, Wand2, MessageSquarePlus } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const SUGGESTIONS = [
  'Write a birthday message for my friend',
  'Suggest a catchy caption for a status',
  'Help me draft a business reply',
  'Explain how to write a professional apology'
];

const STORAGE_KEY = 'genz_ai_conversation_v1';

const GENZAI = ({ close }) => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch { /* ignore */ }
    return [
      { role: 'assistant', content: 'Habari! Mimi ni GENZ AI — msaidizi wako wa kuandika, kutafsiri na kupata mawazo. Niambie unachohitaji.' }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-40)));
    } catch { /* ignore */ }
  }, []);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    persist(next);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content }] })
      });
      const data = await res.json().catch(() => ({}));

      const reply = data.success && data.content
        ? data.content
        : 'Samahani, sikupata jibu. Jaribu tena baadaye.';

      const final = [...next, { role: 'assistant', content: reply, meta: data }];
      setMessages(final);
      persist(final);
    } catch (err) {
      const final = [...next, { role: 'assistant', content: 'Kuna tatizo la mtandao au server. Tafadhali jaribu tena.' }];
      setMessages(final);
      persist(final);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    const fresh = [{ role: 'assistant', content: 'Habari! Mimi ni GENZ AI — msaidizi wako wa kuandika, kutafsiri na kupata mawazo. Niambie unachohitaji.' }];
    setMessages(fresh);
    persist(fresh);
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0b141a]">
      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-3 flex-shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a2e35 0%, #0d3b2e 55%, #064e3b 100%)' }}>
        <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)' }} />
        <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', transform: 'rotate(-6deg)' }}>
          <Bot size={22} className="text-[#052e1f]" />
        </div>
        <div className="relative flex-1 min-w-0">
          <h1 className="text-white font-extrabold text-lg leading-tight tracking-tight">GENZ AI</h1>
          <p className="text-[11px] text-emerald-200/70 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {loading ? 'Inafikiri...' : 'Msaidizi wako wa akili'}
          </p>
        </div>
        <button onClick={clearChat} title="Futa mazungumzo" aria-label="Clear chat"
          className="relative p-2 rounded-lg hover:bg-white/10 text-emerald-100/80 transition-colors">
          <Trash2 size={17} />
        </button>
        <button onClick={close} aria-label="Close"
          className="relative p-2 rounded-lg hover:bg-white/10 text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isMock = msg.meta?.mock === true;
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  isUser ? 'bg-[#1f2c33]' : 'bg-emerald-500/20'
                }`}>
                  {isUser ? <User size={14} className="text-white/80" /> : <Sparkles size={14} className="text-emerald-400" />}
                </div>
                <div>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-[#005c4b] text-white rounded-br-sm'
                        : 'bg-[#1f2c33] text-gray-100 rounded-bl-sm border border-white/5'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  {isMock && (
                    <p className="mt-1 text-[10px] text-amber-400/70 flex items-center gap-1">
                      <Wand2 size={10} /> Dev mode — jibu la mfano (hakuna AI_API_KEY)
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1f2c33] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-emerald-400/80 rounded-full inline-block"
                  style={{ animation: 'typingBounce 1.2s infinite ease-in-out', animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5">
            <MessageSquarePlus size={11} /> Jaribu
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-[12px] px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-gray-200 hover:bg-emerald-500/20 hover:border-emerald-400/40 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 flex-shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-2 bg-[#1f2c33] border border-white/10 rounded-2xl px-3 py-2 focus-within:border-emerald-400/40 transition-colors"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder="Andika ujumbe kwa GENZ AI..."
            className="flex-1 bg-transparent text-white text-[13px] outline-none resize-none max-h-32 py-1.5"
            style={{ lineHeight: '1.4' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
            style={{ background: input.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#2a3942' }}
            aria-label="Send"
          >
            <Send size={16} style={{ marginLeft: 1 }} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GENZAI;
