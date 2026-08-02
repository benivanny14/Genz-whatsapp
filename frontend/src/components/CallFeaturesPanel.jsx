import React, { useEffect, useState } from 'react';
import { Phone, X, RefreshCw, Zap, FileText, Clock, Plus, Trash2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const BASE = `${resolveApiBase()}/call-features`;

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

const TOGGLE_FIELDS = [
  ['callWaiting', 'Call waiting', 'Get notified of a new call while already on one'],
  ['callHold', 'Call hold', 'Allow putting a call on hold'],
  ['callTransfer', 'Call transfer', 'Allow transferring an active call'],
  ['callScreenShare', 'Screen share on calls', 'Allow sharing your screen during video calls'],
  ['callVideoToggle', 'Switch to video mid-call', 'Allow turning video on/off during a voice call'],
  ['callMute', 'Mute button', 'Show the mute button during calls'],
  ['callBlocker', 'Block unknown callers', 'Silently reject calls from numbers not in your contacts'],
  ['callHistory', 'Keep call history', 'Log calls in your call history'],
  ['callLink', 'Call links', 'Allow creating shareable call links'],
  ['hideCallButton', 'Hide call button', "Hide the call button in chats you don't want to be called from"],
  ['dndModeForCalls', 'Do Not Disturb for calls', 'Silence all incoming calls'],
  ['disableVoiceCalls', 'Disable voice calls', 'Turn off the ability to receive voice calls'],
  ['disableVideoCalls', 'Disable video calls', 'Turn off the ability to receive video calls'],
  ['autoAnswerCalls', 'Auto-answer calls', 'Automatically answer incoming calls'],
  ['callRecording', 'Call recording', 'Allow recording calls (where legally permitted)'],
];

const CallFeaturesPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [speedDialContacts, setSpeedDialContacts] = useState([]);
  const [callNotes, setCallNotes] = useState([]);
  const [callReminders, setCallReminders] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${BASE}/settings`);
        const data = await res.json();
        if (data?.success) setSettings(data.settings);
        else setError(data?.message || 'Failed to load call settings');
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      if (data?.success) setSettings(data.settings);
      else setError(data?.message || 'Failed to save');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const updateNumber = async (key, value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return;
    const next = { ...settings, [key]: num };
    setSettings(next);
    try {
      await authFetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: num } })
      });
    } catch {
      setError('Could not reach the server.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Phone className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Call settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading || !settings ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              {TOGGLE_FIELDS.map(([key, title, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{title}</p>
                    <p className="text-gray-400 text-xs">{desc}</p>
                  </div>
                  <Toggle checked={!!settings[key]} onChange={() => toggleField(key)} disabled={saving} />
                </div>
              ))}

              <div className="pt-2 border-t border-white/10 space-y-3">
                <div>
                  <label className="text-gray-400 text-xs">Ring timeout (seconds)</label>
                  <input
                    type="number"
                    min={5}
                    value={settings.callTimeout}
                    onChange={(e) => updateNumber('callTimeout', e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm mt-1 focus:outline-none focus:border-[#00a884]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs">Max call duration (seconds)</label>
                  <input
                    type="number"
                    min={30}
                    value={settings.maxCallDuration}
                    onChange={(e) => updateNumber('maxCallDuration', e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm mt-1 focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>

              {/* Speed Dial */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Speed Dial</h3>
                </div>
                <div className="space-y-2">
                  {speedDialContacts.length === 0 ? (
                    <p className="text-white/40 text-xs text-center py-2">No speed dial contacts</p>
                  ) : (
                    speedDialContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <span className="text-white text-sm">{contact.name}</span>
                        <button
                          onClick={() => setSpeedDialContacts(speedDialContacts.filter(c => c.id !== contact.id))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                  <button className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Add Speed Dial Contact
                  </button>
                </div>
              </div>

              {/* Call Notes */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Call Notes</h3>
                </div>
                <div className="space-y-2">
                  {callNotes.length === 0 ? (
                    <p className="text-white/40 text-xs text-center py-2">No call notes</p>
                  ) : (
                    callNotes.map((note) => (
                      <div key={note.id} className="bg-white/5 rounded-lg p-2">
                        <p className="text-white text-sm">{note.text}</p>
                        <p className="text-white/40 text-xs mt-1">{note.date}</p>
                      </div>
                    ))
                  )}
                  <button className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Add Call Note
                  </button>
                </div>
              </div>

              {/* Call Reminders */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-[#00a884]" />
                  <h3 className="text-white font-medium">Call Reminders</h3>
                </div>
                <div className="space-y-2">
                  {callReminders.length === 0 ? (
                    <p className="text-white/40 text-xs text-center py-2">No call reminders</p>
                  ) : (
                    callReminders.map((reminder) => (
                      <div key={reminder.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                        <div>
                          <p className="text-white text-sm">{reminder.contact}</p>
                          <p className="text-white/40 text-xs">{reminder.time}</p>
                        </div>
                        <button
                          onClick={() => setCallReminders(callReminders.filter(r => r.id !== reminder.id))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                  <button className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Set Call Reminder
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallFeaturesPanel;
