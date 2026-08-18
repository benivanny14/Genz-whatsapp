import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, RefreshCw, Shield, Globe, Fingerprint, Lock, ScanLine, Video, Cpu, Network, Smartphone } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/security-mods`;

const TOGGLE_ROWS = [
  { key: 'antiBanProtection', icon: Shield, title: 'Anti-Ban Protection', description: 'Protect your account from being flagged or banned.' },
  { key: 'proxySupport', icon: Network, title: 'Proxy Support', description: 'Route traffic through a proxy for safety.' },
  { key: 'ipSpoofing', icon: Globe, title: 'IP Spoofing', description: 'Mask your real IP address.' },
  { key: 'deviceSpoofing', icon: Smartphone, title: 'Device Spoofing', description: 'Present a different device identity.' },
  { key: 'appLockPattern', icon: Lock, title: 'App Lock Pattern', description: 'Lock the app with a pattern.' },
  { key: 'appLockPIN', icon: Lock, title: 'App Lock PIN', description: 'Lock the app with a PIN.' },
  { key: 'appLockFingerprint', icon: Fingerprint, title: 'App Lock Fingerprint', description: 'Unlock the app with your fingerprint.' },
  { key: 'appLockFace', icon: ScanLine, title: 'App Lock Face', description: 'Unlock the app with face recognition.' },
  { key: 'antiScreenshot', icon: ScanLine, title: 'Anti-Screenshot', description: 'Block screenshots of your chats.' },
  { key: 'screenRecordingDetection', icon: Video, title: 'Screen Recording Detection', description: 'Get notified when someone records your screen.' }
];

const VPN_REGIONS = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'usa', label: 'United States' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'africa', label: 'Africa' },
  { value: 'middle-east', label: 'Middle East' }
];

const SecurityModsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vpnStatus, setVpnStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE}/settings`);
        const data = await res.json();
        if (data?.success) setSettings(data.settings);
        else setError(data?.message || 'Failed to load security MODs settings');
        const vpnRes = await authFetch(`${BASE}/vpn`).catch(() => null);
        if (vpnRes && vpnRes.ok) {
          const vpnData = await vpnRes.json();
          if (vpnData?.success) setVpnStatus(vpnData.vpn || null);
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

  const setVpn = async (region, enabled = settings?.vpnMode !== false) => {
    setSaving(true);
    setError('');
    const next = { ...settings, vpnMode: enabled, vpnRegion: region };
    setSettings(next);
    try {
      const res = await authFetch(`${BASE}/vpn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, region })
      });
      const data = await res.json();
      if (data?.success) {
        // toggleVPN returns a flat { vpnMode, vpnRegion } shape (not { settings })
        if (data.settings) setSettings(data.settings);
        else if (data.vpnMode !== undefined) {
          setSettings((prev) => ({ ...prev, vpnMode: data.vpnMode, vpnRegion: data.vpnRegion }));
        }
      } else {
        setError(data?.message || 'Failed to save VPN settings');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
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
            <ShieldCheck className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Security MODs</h2>
              <p className="text-gray-400 text-xs">Advanced account protection</p>
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
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Account Protection</p>
                {TOGGLE_ROWS.map(renderToggle)}
              </div>

              {/* VPN */}
              <div className="rounded-xl border border-[#00a884]/20 bg-[#00a884]/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Globe size={18} className="text-[#00a884] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">VPN Mode</p>
                      <p className="text-gray-400 text-xs">Route your connection through a secure region.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!settings?.vpnMode}
                      onChange={(e) => setVpn(settings?.vpnRegion || 'auto', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>
                {settings?.vpnMode && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-300 w-24 shrink-0">Region</label>
                    <select
                      value={settings.vpnRegion || 'auto'}
                      onChange={(e) => setVpn(e.target.value, true)}
                      className="flex-1 rounded-xl border border-white/15 bg-[#0b141a] px-3 py-2 text-sm text-white outline-none focus:border-[#00a884]"
                    >
                      {VPN_REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                {vpnStatus?.enabled && (
                  <p className="text-xs text-[#00a884]">
                    VPN active{settings?.vpnRegion && settings.vpnRegion !== 'auto' ? ` · ${settings.vpnRegion}` : ''}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityModsPanel;
