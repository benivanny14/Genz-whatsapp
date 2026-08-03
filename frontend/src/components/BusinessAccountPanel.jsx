import React, { useEffect, useState } from 'react';
import { Building2, Clock, MessageSquare, Moon, Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/business-account`;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

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

const BusinessAccountPanel = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [newQuickReply, setNewQuickReply] = useState({ keyword: '', message: '' });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${BASE}/settings`);
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
      else setError(data?.message || 'Failed to load business settings');
    } catch (err) {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const call = async (path, body) => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data?.success && data.settings) {
        setSettings(data.settings);
      } else if (!data?.success) {
        setError(data?.message || 'Action failed');
      }
      return data;
    } catch (err) {
      setError('Could not reach the server.');
      return { success: false };
    } finally {
      setSaving(false);
    }
  };

  const handleEnableToggle = async () => {
    if (settings.businessAccountEnabled) {
      await call('/disable', {});
      return;
    }
    if (!settings.businessName || !settings.businessCategory) {
      setError('Enter a business name and category first, then enable.');
      return;
    }
    await call('/enable', {
      businessName: settings.businessName,
      businessCategory: settings.businessCategory,
      businessPhone: settings.businessPhone
    });
  };

  const saveProfileFields = async () => {
    await call('/settings', {
      settings: {
        businessName: settings.businessName,
        businessCategory: settings.businessCategory,
        businessDescription: settings.businessDescription,
        businessPhone: settings.businessPhone,
        businessAddress: settings.businessAddress
      }
    });
  };

  const updateDayHours = (day, field, value) => {
    setSettings((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value }
      }
    }));
  };

  const saveHours = async () => {
    await call('/hours', { businessHours: settings.businessHours });
  };

  const saveAutoReply = async (enabled, message) => {
    await call('/auto-reply', { enabled, message });
  };

  const saveAwayMode = async (enabled, message) => {
    await call('/away-mode', { enabled, message });
  };

  const addQuickReply = async () => {
    if (!newQuickReply.keyword.trim() || !newQuickReply.message.trim()) return;
    const data = await call('/quick-reply', newQuickReply);
    if (data?.success) setNewQuickReply({ keyword: '', message: '' });
  };

  const deleteQuickReply = async (id) => {
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/quick-reply/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.success) {
        setSettings((prev) => ({ ...prev, quickReplies: data.quickReplies }));
      }
    } catch (err) {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-[#00a884]" size={32} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Building2 className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Business Account</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Business account</p>
              <p className="text-gray-400 text-xs">Turn on to enable hours, auto-reply and quick replies</p>
            </div>
            <Toggle checked={!!settings.businessAccountEnabled} onChange={handleEnableToggle} disabled={saving} />
          </div>

          {/* Profile fields */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Business profile</p>
            <input
              value={settings.businessName || ''}
              onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              placeholder="Business name"
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
            />
            <input
              value={settings.businessCategory || ''}
              onChange={(e) => setSettings({ ...settings, businessCategory: e.target.value })}
              placeholder="Category (e.g. Retail)"
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
            />
            <textarea
              value={settings.businessDescription || ''}
              onChange={(e) => setSettings({ ...settings, businessDescription: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884] resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input value={settings.businessPhone || ''} onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })} placeholder="Phone" className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]" />
            </div>
            <input
              value={settings.businessAddress || ''}
              onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
              placeholder="Address"
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
            />
            <button onClick={saveProfileFields} disabled={saving} className="w-full bg-[#00a884]/20 text-[#00a884] py-2 rounded-lg text-sm font-medium hover:bg-[#00a884]/30 disabled:opacity-50">
              Save profile
            </button>
          </div>

          {/* Business hours */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide flex items-center gap-1"><Clock size={12} /> Business hours</p>
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <Toggle
                  checked={!!settings.businessHours?.[day]?.enabled}
                  onChange={() => updateDayHours(day, 'enabled', !settings.businessHours?.[day]?.enabled)}
                />
                <span className="text-white text-xs w-9">{DAY_LABELS[day]}</span>
                <input
                  type="time"
                  value={settings.businessHours?.[day]?.open || '09:00'}
                  onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                  disabled={!settings.businessHours?.[day]?.enabled}
                  className="bg-[#0b141a] text-white px-2 py-1 rounded border border-white/10 text-xs disabled:opacity-40"
                />
                <span className="text-gray-500 text-xs">–</span>
                <input
                  type="time"
                  value={settings.businessHours?.[day]?.close || '17:00'}
                  onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                  disabled={!settings.businessHours?.[day]?.enabled}
                  className="bg-[#0b141a] text-white px-2 py-1 rounded border border-white/10 text-xs disabled:opacity-40"
                />
              </div>
            ))}
            <button onClick={saveHours} disabled={saving} className="w-full bg-[#00a884]/20 text-[#00a884] py-2 rounded-lg text-sm font-medium hover:bg-[#00a884]/30 disabled:opacity-50">
              Save hours
            </button>
          </div>

          {/* Auto reply */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs uppercase tracking-wide flex items-center gap-1"><MessageSquare size={12} /> Auto-reply</p>
              <Toggle
                checked={!!settings.autoReplies?.enabled}
                onChange={() => saveAutoReply(!settings.autoReplies?.enabled, settings.autoReplies?.message)}
              />
            </div>
            <textarea
              value={settings.autoReplies?.message || ''}
              onChange={(e) => setSettings({ ...settings, autoReplies: { ...settings.autoReplies, message: e.target.value } })}
              onBlur={() => saveAutoReply(settings.autoReplies?.enabled, settings.autoReplies?.message)}
              rows={2}
              placeholder="Message sent automatically to new chats"
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          {/* Away mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs uppercase tracking-wide flex items-center gap-1"><Moon size={12} /> Away mode</p>
              <Toggle
                checked={!!settings.awayMode}
                onChange={() => saveAwayMode(!settings.awayMode, settings.awayMessage)}
              />
            </div>
            <textarea
              value={settings.awayMessage || ''}
              onChange={(e) => setSettings({ ...settings, awayMessage: e.target.value })}
              onBlur={() => saveAwayMode(settings.awayMode, settings.awayMessage)}
              rows={2}
              placeholder="Message sent while you're away"
              className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          {/* Quick replies */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Quick replies</p>
            {(settings.quickReplies || []).map((qr) => (
              <div key={qr._id} className="flex items-start gap-2 bg-[#0b141a] rounded-lg p-2 border border-white/10">
                <div className="flex-1 min-w-0">
                  <p className="text-[#00a884] text-xs font-mono">/{qr.keyword}</p>
                  <p className="text-white text-sm truncate">{qr.message}</p>
                </div>
                <button onClick={() => deleteQuickReply(qr._id)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newQuickReply.keyword}
                onChange={(e) => setNewQuickReply({ ...newQuickReply, keyword: e.target.value })}
                placeholder="keyword"
                className="w-24 bg-[#0b141a] text-white px-2 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
              />
              <input
                value={newQuickReply.message}
                onChange={(e) => setNewQuickReply({ ...newQuickReply, message: e.target.value })}
                placeholder="Reply message"
                className="flex-1 bg-[#0b141a] text-white px-2 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
              />
              <button onClick={addQuickReply} disabled={saving} className="bg-[#00a884] text-white px-3 rounded-lg disabled:opacity-50">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessAccountPanel;
