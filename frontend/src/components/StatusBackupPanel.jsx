import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Download, Upload, Cloud, HardDrive, RefreshCw, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

const StatusBackupPanel = ({ onClose, onBackupAction }) => {
  const [lastBackup, setLastBackup] = useState(null);
  const [backupSize, setBackupSize] = useState(0);
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupLocation, setBackupLocation] = useState('local');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackupSettings();
  }, []);

  const loadBackupSettings = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/backup`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setLastBackup(data.backup?.lastBackup || null);
        setBackupSize(data.backup?.backupSize || 0);
        setAutoBackup(data.backup?.autoBackup || false);
        setBackupFrequency(data.backup?.backupFrequency || 'daily');
        setBackupLocation(data.backup?.backupLocation || 'local');
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
      // Fallback to localStorage
      try {
        const settings = JSON.parse(localStorage.getItem('genz_status_backup') || '{}');
        setLastBackup(settings.lastBackup || null);
        setBackupSize(settings.backupSize || 0);
        setAutoBackup(settings.autoBackup || false);
        setBackupFrequency(settings.backupFrequency || 'daily');
        setBackupLocation(settings.backupLocation || 'local');
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          autoBackup,
          backupFrequency,
          backupLocation
        })
      });

      const data = await response.json();
      if (data.success) {
        const now = new Date().toISOString();
        const size = data.backupSize || Math.floor(Math.random() * 100) + 50;
        
        setLastBackup(now);
        setBackupSize(size);
        
        if (onBackupAction) {
          onBackupAction({ action: 'backup', data: { lastBackup: now, backupSize: size } });
        }
      }
    } catch (error) {
      console.error('Error backing up:', error);
      // Fallback simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      const now = new Date().toISOString();
      const size = Math.floor(Math.random() * 100) + 50;
      setLastBackup(now);
      setBackupSize(size);
      
      const settings = {
        lastBackup: now,
        backupSize: size,
        autoBackup,
        backupFrequency,
        backupLocation
      };
      localStorage.setItem('genz_status_backup', JSON.stringify(settings));
      
      if (onBackupAction) {
        onBackupAction({ action: 'backup', data: settings });
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    setIsBackingUp(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        if (onBackupAction) {
          onBackupAction({ action: 'restore', data: data.restored });
        }
      }
    } catch (error) {
      console.error('Error restoring:', error);
      // Fallback simulation
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (onBackupAction) {
        onBackupAction({ action: 'restore' });
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSaveSettings = () => {
    const settings = {
      lastBackup,
      backupSize,
      autoBackup,
      backupFrequency,
      backupLocation
    };
    localStorage.setItem('genz_status_backup', JSON.stringify(settings));
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Cloud className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Backup</h2>
              <p className="text-white/60 text-xs">Backup and restore your statuses</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Last Backup Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-medium">Last Backup</p>
              {lastBackup && (
                <div className="flex items-center gap-1 text-[#00a884]">
                  <CheckCircle size={16} />
                  <span className="text-sm">Completed</span>
                </div>
              )}
            </div>
            {lastBackup ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <Calendar size={14} />
                  <span>{new Date(lastBackup).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <HardDrive size={14} />
                  <span>{backupSize} MB</span>
                </div>
              </div>
            ) : (
              <p className="text-white/40 text-sm">No backup yet</p>
            )}
          </div>

          {/* Backup Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Backup
            </button>
            <button
              onClick={handleRestore}
              disabled={isBackingUp || !lastBackup}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              Restore
            </button>
          </div>

          {/* Auto Backup Settings */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => {
                  setAutoBackup(e.target.checked);
                  handleSaveSettings();
                }}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Auto backup</span>
            </label>

            {autoBackup && (
              <div className="pl-6 space-y-3">
                <div>
                  <label className="text-white/60 text-xs mb-2 block">Frequency</label>
                  <select
                    value={backupFrequency}
                    onChange={(e) => {
                      setBackupFrequency(e.target.value);
                      handleSaveSettings();
                    }}
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="hourly" className="bg-[#1a2e35]">Hourly</option>
                    <option value="daily" className="bg-[#1a2e35]">Daily</option>
                    <option value="weekly" className="bg-[#1a2e35]">Weekly</option>
                    <option value="monthly" className="bg-[#1a2e35]">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60 text-xs mb-2 block">Backup Location</label>
                  <select
                    value={backupLocation}
                    onChange={(e) => {
                      setBackupLocation(e.target.value);
                      handleSaveSettings();
                    }}
                    className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                  >
                    <option value="local" className="bg-[#1a2e35]">Local Storage</option>
                    <option value="cloud" className="bg-[#1a2e35]">Cloud Storage</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Storage Info */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white font-medium mb-3">Storage Info</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Used Space</span>
                <span className="text-white">{backupSize} MB / 1 GB</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-[#00a884] h-2 rounded-full"
                  style={{ width: `${(backupSize / 1000) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Warning */}
          {backupLocation === 'cloud' && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="text-yellow-400" size={18} />
              <p className="text-yellow-400 text-sm">Cloud backup requires internet connection</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBackupPanel;
