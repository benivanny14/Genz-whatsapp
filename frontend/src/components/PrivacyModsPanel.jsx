import React, { useEffect, useState } from 'react';
import { Eye, X, RefreshCw, BellOff, UserX, EyeOff, Ban, Camera, Clock, Languages, CheckCheck, Smile, Bell, Download } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/privacy-mods`;

const TOGGLE_ROWS = [
  { key: 'freezeLastSeen', icon: Clock, title: 'Freeze Last Seen', description: 'Keep your last seen timestamp fixed.' },
  { key: 'ghostMode', icon: EyeOff, title: 'Ghost Mode', description: 'Browse and read without leaving traces.' },
  { key: 'hideOnline', icon: EyeOff, title: 'Hide Online', description: 'Do not show your online status to others.' },
  { key: 'antiViewOnce', icon: Camera, title: 'Anti View-Once', description: 'Block screenshots of view-once messages.' },
  { key: 'disableForwardedTag', icon: Ban, title: 'Disable Forwarded Tag', description: 'Hide the "forwarded" label on messages.' },
  { key: 'hideStatusView', icon: Eye, title: 'Hide Status View', description: 'Hide your name from status viewers.' },
  { key: 'hideReadReceipts', icon: CheckCheck, title: 'Hide Read Receipts', description: 'Do not send blue ticks for your messages.' },
  { key: 'whoViewedProfile', icon: UserX, title: 'Who Viewed Profile', description: 'Control who can see your profile views.' },
  { key: 'contactOnlineNotifier', icon: Bell, title: 'Contact Online Notifier', description: 'Get notified when contacts come online.' },
  { key: 'autoDownloadStatus', icon: Download, title: 'Auto-Download Status', description: 'Automatically download status updates.' },
  { key: 'languagePerChat', icon: Languages, title: 'Language per Chat', description: 'Set a different language for each chat.' },
  { key: 'customTickPerContact', icon: CheckCheck, title: 'Custom Tick per Contact', description: 'Personalize message ticks per contact.' },
  { key: 'customEmojiStyle', icon: Smile, title: 'Custom Emoji Style', description: 'Use a custom emoji style for your chats.' },
  { key: 'blockAlerts', icon: BellOff, title: 'Block Alerts', description: 'Get notified when someone blocks you.' }
];

const PrivacyModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [blockAlerts, setBlockAlerts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE}/settings`);
        const data = await res.json();
        if (data?.success) setSettings(data.settings);
        else setError(data?.message || 'Failed to load privacy MODs settings');
        const alertsRes = await authFetch(`${BASE}/block-alerts`).catch(() => null);
        if (alertsRes && alertsRes.ok) {
          const alertsData = await alertsRes.json();
          if (alertsData?.success) setBlockAlerts(alertsData.alerts || alertsData.blockAlerts || []);
        }
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: next[key] } })
      });
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
      else {
        setError(data?.message || 'Failed to save');
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
      }
    } catch {
      setError('Could not reach the server.');
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    } finally {
      setSaving(false);
    }
  };

  const clearBlockAlerts = async () => {
    try {
      await authFetch(`${BASE}/block-alerts`, { method: 'DELETE' });
      setBlockAlerts([]);
    } catch {
      setError('Failed to clear block alerts');
    }
  };

  const renderToggle = ({ key, icon: Icon, title, description }) => (
    <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <Icon size={18} className="text-[#00a884] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-white text-sm font-medium">{title}</p>
          <p className="text-gray-400 text-xs">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={!!settings?.[key]}
          onChange={() => toggle(key)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
      </label>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Eye className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Privacy MODs</h2>
              <p className="text-gray-400 text-xs">Advanced privacy controls</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}
          {saving && <div className="bg-[#00a884]/10 border border-[#00a884]/20 text-[#00a884] text-xs rounded-lg p-2">Saving...</div>}

          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Privacy MODs</p>
                {TOGGLE_ROWS.map(renderToggle)}
              </div>

              {blockAlerts.length > 0 && (
                <div className="rounded-xl border border-[#00a884]/20 bg-[#00a884]/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-semibold">Block Alerts ({blockAlerts.length})</p>
                    <button
                      onClick={clearBlockAlerts}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {blockAlerts.slice(0, 8).map((a, i) => (
                      <li key={i} className="text-xs text-gray-300">
                        <span className="text-white font-medium">{a.actorName || 'Someone'}</span> {a.action === 'unblocked' ? 'unblocked you' : 'blocked you'} — {a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyModsPanel;
