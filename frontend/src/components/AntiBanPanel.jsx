import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api/anti-ban`;

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`w-12 h-6 rounded-full transition-all flex-shrink-0 ${checked ? 'bg-[#00a884]' : 'bg-white/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div className={`w-5 h-5 bg-white rounded-full transition-all ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
  </button>
);

const TOGGLES = [
  ['antiBanEnabled', 'Anti-ban protection', 'Overall protection against automated bans'],
  ['secureMode', 'Secure mode', 'Extra checks before risky actions'],
  ['rateLimiting', 'Rate limiting', 'Slow down rapid actions that look automated'],
  ['deviceSpoof', 'Device spoofing', 'Vary reported device info between sessions'],
  ['ipMask', 'IP masking', 'Hide your IP pattern where possible'],
  ['detectSuspiciousActivity', 'Detect suspicious activity', 'Flag unusual account activity automatically'],
  ['autoBanProtection', 'Auto-ban protection', 'Automatically slow down before hitting platform limits'],
  ['hideDeviceInfo', 'Hide device info', "Don't expose device details to third parties"],
  ['randomizeUserAgent', 'Randomize user agent', 'Vary browser/client signature between sessions'],
];

const scoreColor = (score) => (score >= 80 ? '#00a884' : score >= 50 ? '#f0b429' : '#ef4444');

const AntiBanPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, stRes] = await Promise.all([
        authFetch(`${BASE}/settings`),
        authFetch(`${BASE}/security-status`)
      ]);
      const sData = await sRes.json();
      const stData = await stRes.json();
      if (sData?.success) setSettings(sData.settings);
      if (stData?.success) setStatus(stData.status);
      if (!sData?.success) setError(sData?.message || 'Failed to load settings');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleField = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: next[key] } })
      });
      const data = await res.json();
      if (data?.success) {
        setSettings(data.settings);
        const stRes = await authFetch(`${BASE}/security-status`);
        const stData = await stRes.json();
        if (stData?.success) setStatus(stData.status);
      } else {
        setError(data?.message || 'Failed to save');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const clearWarning = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/clear-warning`, { method: 'POST' });
      const data = await res.json();
      if (data?.success) {
        const stRes = await authFetch(`${BASE}/security-status`);
        const stData = await stRes.json();
        if (stData?.success) setStatus(stData.status);
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Account security</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading || !settings ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              {status && (
                <div className="bg-[#0b141a] rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">Security score</p>
                    <p className="text-lg font-bold" style={{ color: scoreColor(status.securityScore) }}>{status.securityScore}/100</p>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${status.securityScore}%`, backgroundColor: scoreColor(status.securityScore) }} />
                  </div>
                  {status.warningLevel && status.warningLevel !== 'none' && (
                    <div className="mt-3 flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                      <div className="flex items-center gap-2 text-yellow-300 text-xs">
                        <AlertTriangle size={14} /> Warning level: {status.warningLevel}
                      </div>
                      <button onClick={clearWarning} disabled={saving} className="text-xs text-yellow-300 underline">Clear</button>
                    </div>
                  )}
                  {status.recentSuspiciousActivities > 0 && (
                    <p className="text-gray-400 text-xs mt-2">{status.recentSuspiciousActivities} suspicious activity flag(s) in the last 24h</p>
                  )}
                </div>
              )}

              {TOGGLES.map(([key, title, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{title}</p>
                    <p className="text-gray-400 text-xs">{desc}</p>
                  </div>
                  <Toggle checked={!!settings[key]} onChange={() => toggleField(key)} disabled={saving} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AntiBanPanel;
