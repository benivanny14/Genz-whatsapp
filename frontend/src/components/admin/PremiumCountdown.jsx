import { useState, useEffect } from 'react';

const calcRemaining = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, text: 'Imekwisha', days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const text = days > 0 ? `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m` : `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  return { expired: false, text, days, hours, minutes, seconds, diff };
};

export default function PremiumCountdown({ expiresAt, compact = false }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt));

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setRemaining(calcRemaining(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return <span className="text-gray-500 text-xs">—</span>;
  if (!remaining) return <span className="text-gray-500 text-xs">—</span>;
  if (remaining.expired) return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">Imekwisha</span>;

  const color = remaining.days === 0 && remaining.hours < 24 ? 'text-red-400 bg-red-500/20' : remaining.days < 7 ? 'text-amber-400 bg-amber-500/20' : 'text-emerald-400 bg-emerald-500/20';
  if (compact) return <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${color}`}>{remaining.text}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${color}`} title={new Date(expiresAt).toLocaleString()}>
      <span>{remaining.text}</span>
      <span className="opacity-60">•</span>
      <span className="text-[10px] opacity-70">{new Date(expiresAt).toLocaleDateString()}</span>
    </span>
  );
}
