import React, { useState } from 'react';
import { Calendar, X, Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const JumpToDate = ({ messages, containerRef, onClose }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [found, setFound] = useState(null);

  const handleJump = () => {
    if (!selectedDate || !messages?.length || !containerRef?.current) return;

    const target = new Date(selectedDate);
    target.setHours(0, 0, 0, 0);
    const targetEnd = new Date(target);
    targetEnd.setHours(23, 59, 59, 999);

    // Find first message on that date
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const match = sorted.find(msg => {
      const msgDate = new Date(msg.createdAt);
      return msgDate >= target && msgDate <= targetEnd;
    });

    if (match) {
      setFound(match._id || match.id);
      const el = containerRef.current.querySelector(`[data-message-id="${match._id || match.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-flash');
        setTimeout(() => el.classList.remove('highlight-flash'), 2000);
      }
      onClose?.();
    } else {
      setFound('none');
      setTimeout(() => setFound(null), 2000);
    }
  };

  const quickDates = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    quickDates.push(d);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20" onClick={onClose}>
      <div className="bg-[#1f2c33] rounded-xl w-96 p-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Calendar size={18} className="text-[#00a884]" /> Jump to Date
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setFound(null); }}
          className="w-full bg-[#0b141a] text-white border border-white/10 rounded-lg p-3 mb-3 focus:border-[#00a884] outline-none"
        />

        <div className="flex gap-2 mb-4">
          {quickDates.map((d, i) => {
            const isToday = i === 0;
            const dateStr = format(d, 'yyyy-MM-dd');
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  selectedDate === dateStr
                    ? 'bg-[#00a884] border-[#00a884] text-white'
                    : 'border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                {isToday ? 'Today' : format(d, 'EEE')}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleJump}
          disabled={!selectedDate}
          className="w-full bg-[#00a884] text-white py-2.5 rounded-lg font-bold hover:bg-[#008f72] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Search size={16} />
          Jump to Date
        </button>

        {found === 'none' && (
          <p className="text-red-400 text-sm text-center mt-3">No messages found on this date.</p>
        )}
      </div>
    </div>
  );
};

export default JumpToDate;
