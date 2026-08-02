import React, { useEffect, useState } from 'react';
import { Eye, X, RefreshCw, UserPlus, UserMinus, Search, Clock, Shield, Camera, Lock, Fingerprint } from 'lucide-react';
import { authFetch } from '../utils/authFetch';
import userService from '../services/userService';
import { resolveApiBase } from '../utils/resolveApiBase';
import PrivacyPermissionSelector from './PrivacyPermissionSelector';
import ContactSelectorScreen from './ContactSelectorScreen';

const BASE = `${resolveApiBase()}/status-features`;

const StatusPrivacyPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSelectorConfig, setContactSelectorConfig] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, genericRes, contactList] = await Promise.all([
          authFetch(`${BASE}/settings`),
          userService.getSettings().catch(() => null),
          userService.getContacts().catch(() => [])
        ]);
        const sData = await sRes.json();
        if (sData?.success) setSettings(sData.settings);
        else setError(sData?.message || 'Failed to load status settings');
        if (genericRes?.success && genericRes.settings?.privacy?.status) {
          setSettings((prev) => ({ ...prev, statusPrivacy: genericRes.settings.privacy.status }));
        }
        setContacts(Array.isArray(contactList) ? contactList : (contactList?.contacts || []));
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setPrivacy = async (privacy) => {
    setSettings((prev) => ({ ...prev, statusPrivacy: privacy }));
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/privacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy })
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

  const toggleAdvancedSetting = async (key) => {
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

  const handleStatusPrivacyChange = async (value) => {
    try {
      // Update local settings
      setSettings((prev) => ({ ...prev, statusPrivacy: value }));

      // Save to server via the generic settings API (supports contacts_except / only_share_with)
      await userService.updateSettings({ privacy: { status: value } });
    } catch (error) {
      console.error('Failed to save status privacy:', error);
      setError('Failed to save status privacy.');
    }
  };

  const openContactSelector = async (selectorType) => {
    try {
      // Fetch full contact data from API
      const API_URL = resolveApiBase();
      const response = await fetch(`${API_URL}/chat/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const contacts = (data.contacts || data.users || []).map((c) =>
          c.user
            ? {
                _id: c.user._id,
                username: c.savedName || c.user.username || c.user.name,
                name: c.savedName || c.user.username || c.user.name,
                phoneNumber: c.user.phoneNumber || c.user.phone,
                phone: c.user.phoneNumber || c.user.phone,
                profilePicture: c.user.profilePicture
              }
            : c
        );
        
        setContactSelectorConfig({
          privacyType: 'status',
          selectorType,
          initialSelectedContacts: [],
          contacts: contacts
        });
        setShowContactSelector(true);
      } else {
        // Fallback to existing contacts
        setContactSelectorConfig({
          privacyType: 'status',
          selectorType,
          initialSelectedContacts: [],
          contacts: contacts
        });
        setShowContactSelector(true);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      // Fallback to existing contacts
      setContactSelectorConfig({
        privacyType: 'status',
        selectorType,
        initialSelectedContacts: [],
        contacts: contacts
      });
      setShowContactSelector(true);
    }
  };

  const handleContactSelectorSave = async (selectedContactIds, selectedContactData) => {
    const { selectorType } = contactSelectorConfig;
    
    try {
      const API_URL = resolveApiBase();
      
      if (selectorType === 'excluded') {
        // Clear existing and add new
        await fetch(`${API_URL}/privacy/excluded/type/status`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (selectedContactData.length > 0) {
          await fetch(`${API_URL}/privacy/excluded/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              privacyType: 'status',
              contacts: selectedContactData
            })
          });
        }
      } else if (selectorType === 'allowed') {
        // Clear existing and add new
        await fetch(`${API_URL}/privacy/allowed/type/status`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (selectedContactData.length > 0) {
          await fetch(`${API_URL}/privacy/allowed/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              privacyType: 'status',
              contacts: selectedContactData
            })
          });
        }
      }
      
      setShowContactSelector(false);
    } catch (error) {
      console.error('Failed to update contact list:', error);
    }
  };

  // Make openContactSelector available globally for PrivacyPermissionSelector
  useEffect(() => {
    window.openContactSelector = openContactSelector;
    return () => {
      delete window.openContactSelector;
    };
  }, [contacts]);

  const toggleCloseFriend = async (userId, isMember) => {
    setSaving(true);
    try {
      const res = await authFetch(`${BASE}/close-friends/${isMember ? 'remove' : 'add'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data?.success) setSettings((prev) => ({ ...prev, closeFriends: data.closeFriends }));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    (c.username || c.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const closeFriends = settings?.closeFriends || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Eye className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Status privacy</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading || !settings ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Who can see my status</p>
                <PrivacyPermissionSelector
                  privacyType="status"
                  currentValue={settings?.statusPrivacy || 'contacts'}
                  options={['contacts', 'contacts_except', 'only_share_with', 'nobody']}
                  onChange={handleStatusPrivacyChange}
                />
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Close friends ({closeFriends.length})</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts"
                    className="w-full bg-[#0b141a] text-white pl-9 pr-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {filteredContacts.map((c) => {
                    const id = c._id || c.id;
                    const isMember = closeFriends.includes(id);
                    return (
                      <div key={id} className="flex items-center justify-between bg-[#0b141a] rounded-lg p-2 border border-white/10">
                        <span className="text-white text-sm truncate">{c.username || c.name}</span>
                        <button
                          onClick={() => toggleCloseFriend(id, isMember)}
                          disabled={saving}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${isMember ? 'bg-red-500/10 text-red-300' : 'bg-[#00a884]/20 text-[#00a884]'}`}
                        >
                          {isMember ? <><UserMinus size={12} /> Remove</> : <><UserPlus size={12} /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                  {filteredContacts.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">No contacts found</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Advanced Privacy</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">View Once</p>
                      <p className="text-white/50 text-xs">Status disappears after first view</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusViewOnce')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusViewOnce ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusViewOnce ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">Disappearing After View</p>
                      <p className="text-white/50 text-xs">Auto-delete after viewer sees it</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusDisappearingAfterView')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusDisappearingAfterView ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusDisappearingAfterView ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">Password Protection</p>
                      <p className="text-white/50 text-xs">Require password to view</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusPasswordProtection')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusPasswordProtection ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusPasswordProtection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">PIN Protection</p>
                      <p className="text-white/50 text-xs">Require PIN to view</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusPinProtection')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusPinProtection ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusPinProtection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">Fingerprint Protection</p>
                      <p className="text-white/50 text-xs">Require biometric authentication</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusFingerprintProtection')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusFingerprintProtection ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusFingerprintProtection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">Screenshot Detection</p>
                      <p className="text-white/50 text-xs">Get notified when screenshot taken</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusScreenshotDetection')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusScreenshotDetection ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusScreenshotDetection ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white text-sm">Anti-Screenshot</p>
                      <p className="text-white/50 text-xs">Prevent screenshots (when supported)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAdvancedSetting('statusAntiScreenshot')}
                    className={`w-12 h-6 rounded-full transition-colors ${settings.statusAntiScreenshot ? 'bg-[#00a884]' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings.statusAntiScreenshot ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {showContactSelector && contactSelectorConfig && (
        <ContactSelectorScreen
          privacyType={contactSelectorConfig.privacyType}
          selectorType={contactSelectorConfig.selectorType}
          contacts={contactSelectorConfig.contacts || contacts}
          initialSelectedContacts={contactSelectorConfig.initialSelectedContacts}
          onSave={handleContactSelectorSave}
          onClose={() => setShowContactSelector(false)}
        />
      )}
    </div>
  );
};

export default StatusPrivacyPanel;
