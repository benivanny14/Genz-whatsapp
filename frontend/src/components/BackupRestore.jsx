import React, { useState } from 'react';
import { Database, X, Download, Upload, RefreshCw, Check, AlertCircle, HardDrive, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BackupRestore = ({ onBackup, onRestore, onScheduleBackup, onClose }) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [lastBackup, setLastBackup] = useState(null);
  const [scheduledBackup, setScheduledBackup] = useState('daily');

  const backupFrequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'never', label: 'Never' },
  ];

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    // Simulate backup progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setBackupProgress(i);
    }

    const backupData = {
      timestamp: Date.now(),
      size: '125 MB',
      chats: 156,
      messages: 4523,
      media: 234
    };

    setLastBackup(backupData);
    setIsBackingUp(false);

    if (onBackup) {
      onBackup(backupData);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setRestoreProgress(0);

    // Simulate restore progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setRestoreProgress(i);
    }

    setIsRestoring(false);

    if (onRestore) {
      onRestore();
    }
  };

  const handleScheduleBackup = () => {
    if (onScheduleBackup) {
      onScheduleBackup(scheduledBackup);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Database size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Backup & Restore</h2>
              <p className="text-gray-400 text-sm">Protect your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Last Backup Info */}
          {lastBackup && (
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive size={18} className="text-[#00a884]" />
                <h3 className="text-white font-semibold">Last Backup</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} />
                  <span>{new Date(lastBackup.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Database size={14} />
                  <span>{lastBackup.size}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-[#1a2e35] rounded p-2 text-center">
                    <p className="text-white font-bold">{lastBackup.chats}</p>
                    <p className="text-gray-500 text-xs">Chats</p>
                  </div>
                  <div className="bg-[#1a2e35] rounded p-2 text-center">
                    <p className="text-white font-bold">{lastBackup.messages}</p>
                    <p className="text-gray-500 text-xs">Messages</p>
                  </div>
                  <div className="bg-[#1a2e35] rounded p-2 text-center">
                    <p className="text-white font-bold">{lastBackup.media}</p>
                    <p className="text-gray-500 text-xs">Media</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Button */}
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBackingUp ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Backing up... {backupProgress}%
              </>
            ) : (
              <>
                <Download size={18} />
                Backup Now
              </>
            )}
          </button>

          {/* Restore Button */}
          <button
            onClick={handleRestore}
            disabled={isRestoring || !lastBackup}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg font-medium hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Restoring... {restoreProgress}%
              </>
            ) : (
              <>
                <Upload size={18} />
                Restore from Backup
              </>
            )}
          </button>

          {/* Schedule Backup */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#00a884]" />
              <h3 className="text-white font-semibold">Auto Backup</h3>
            </div>
            <div className="space-y-3">
              <select
                value={scheduledBackup}
                onChange={(e) => setScheduledBackup(e.target.value)}
                className="w-full bg-[#1a2e35] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                {backupFrequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
              <button
                onClick={handleScheduleBackup}
                className="w-full bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
              >
                Save Schedule
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Backups include chats, messages, and media. Restoring will replace current data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Backup Settings Component
export const BackupSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Database size={18} className="text-[#00a884]" />
            Backup & Restore
          </p>
          <p className="text-gray-400 text-sm">Protect your data</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, backupEnabled: !settings.backupEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.backupEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.backupEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.backupEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Backup frequency</p>
            <select
              value={settings.backupFrequency || 'daily'}
              onChange={(e) => onUpdate({ ...settings, backupFrequency: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include media</p>
              <p className="text-gray-400 text-xs">Backup photos and videos</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, backupMedia: !settings.backupMedia })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.backupMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.backupMedia ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Cloud backup</p>
              <p className="text-gray-400 text-xs">Backup to cloud storage</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, cloudBackup: !settings.cloudBackup })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.cloudBackup ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.cloudBackup ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max backups to keep</p>
            <select
              value={settings.maxBackups || '5'}
              onChange={(e) => onUpdate({ ...settings, maxBackups: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1">1 backup</option>
              <option value="3">3 backups</option>
              <option value="5">5 backups</option>
              <option value="10">10 backups</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Backup Status Component
export const BackupStatus = ({ lastBackup, backupInProgress, onBackup }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[#00a884]" />
          <span className="text-white font-medium">Backup Status</span>
        </div>
        <button
          onClick={onBackup}
          disabled={backupInProgress}
          className="text-[#00a884] hover:underline text-sm disabled:text-gray-500 disabled:no-underline"
        >
          {backupInProgress ? 'Backing up...' : 'Backup Now'}
        </button>
      </div>

      {lastBackup ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} />
            <span>Last backup: {new Date(lastBackup.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <HardDrive size={14} />
            <span>Size: {lastBackup.size}</span>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No backup yet</p>
      )}
    </div>
  );
};

// Backup History Component
export const BackupHistory = ({ backups, onRestore, onDelete }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Database size={18} className="text-[#00a884]" />
        Backup History ({backups.length})
      </h3>

      <div className="space-y-2">
        {backups.map(backup => (
          <motion.div
            key={backup.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">
                    {new Date(backup.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-gray-500 text-xs">{backup.size}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>{backup.chats} chats</span>
                  <span>{backup.messages} messages</span>
                  <span>{backup.media} media</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRestore(backup.id)}
                  className="text-[#00a884] hover:text-white transition-colors"
                  title="Restore"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={() => onDelete(backup.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Delete"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {backups.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Database className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No backups available</p>
        </div>
      )}
    </div>
  );
};

export default BackupRestore;
