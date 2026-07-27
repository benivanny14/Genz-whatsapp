import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, RefreshCw, X, Shield, Bell, Clock } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/location-sharing`;

const LocationSharingPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(null);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchActiveShares();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authFetch(`${BASE}/settings`);
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveShares = async () => {
    try {
      const res = await authFetch(`${BASE}/active`);
      const data = await res.json();
      if (data?.success) setActiveShares(data.shares || []);
    } catch (err) {}
  };

  const updateSettings = async (newSettings) => {
    try {
      setSaving(true);
      const res = await authFetch(`${BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data?.success) setSettings(data.settings);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const stopSharing = async (shareId) => {
    try {
      await authFetch(`${BASE}/stop/${shareId}`, { method: 'POST' });
      setActiveShares(prev => prev.filter(s => s._id !== shareId));
    } catch (err) {
      setError('Failed to stop sharing');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <MapPin className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Location Sharing</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-[#00a884]" size={24} /></div>
          ) : (
            <>
              {/* Settings */}
              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Settings</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Enable Location Sharing</p>
                    <p className="text-gray-400 text-xs">Share your live location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.locationSharingEnabled || false}
                      onChange={(e) => updateSettings({ ...settings, locationSharingEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Fake Location</p>
                    <p className="text-gray-400 text-xs">Use fake GPS location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.fakeLocationEnabled || false}
                      onChange={(e) => updateSettings({ ...settings, fakeLocationEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Hide Real Location</p>
                    <p className="text-gray-400 text-xs">Hide your actual location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.hideRealLocation || false}
                      onChange={(e) => updateSettings({ ...settings, hideRealLocation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Location Notifications</p>
                    <p className="text-gray-400 text-xs">Get notified on location changes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.locationNotifications || false}
                      onChange={(e) => updateSettings({ ...settings, locationNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">Auto-Stop Location</p>
                    <p className="text-gray-400 text-xs">Automatically stop sharing after time</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings?.autoStopLocation || false}
                      onChange={(e) => updateSettings({ ...settings, autoStopLocation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
                  </label>
                </div>
              </div>

              {/* Active Shares */}
              <div className="space-y-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Active Location Shares ({activeShares.length})</p>
                {activeShares.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No active location shares</p>
                ) : (
                  <div className="space-y-2">
                    {activeShares.map(share => (
                      <div key={share._id} className="bg-[#0b141a] rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Navigation size={16} className="text-[#00a884]" />
                            <div>
                              <p className="text-white text-sm">{share.contactName}</p>
                              <p className="text-gray-400 text-xs flex items-center gap-1">
                                <Clock size={12} />
                                {share.duration}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => stopSharing(share._id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Stop
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fake Location Settings */}
              {settings?.fakeLocationEnabled && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Fake Location Settings</p>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Latitude</label>
                    <input
                      type="text"
                      value={settings?.fakeLatitude || ''}
                      onChange={(e) => updateSettings({ ...settings, fakeLatitude: e.target.value })}
                      placeholder="e.g., -1.2921"
                      className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Longitude</label>
                    <input
                      type="text"
                      value={settings?.fakeLongitude || ''}
                      onChange={(e) => updateSettings({ ...settings, fakeLongitude: e.target.value })}
                      placeholder="e.g., 36.8219"
                      className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-[#00a884]"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSharingPanel;
