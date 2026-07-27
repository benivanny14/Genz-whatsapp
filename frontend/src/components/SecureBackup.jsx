import React, { useState } from 'react';
import { Shield, X, Database, Lock, Check, AlertCircle, Key, RefreshCw, Cloud, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecureBackup = ({ backupStatus, onCreateBackup, onRestoreBackup, onVerifyBackup, onClose }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    setBackupProgress(0);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setBackupProgress(i);
    }

    setIsCreating(false);
    if (onCreateBackup) {
      onCreateBackup();
    }
  };

  const handleRestoreBackup = async () => {
    if (!encryptionKey) {
      setShowKeyInput(true);
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(0);

    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setRestoreProgress(i);
    }

    setIsRestoring(false);
    setShowKeyInput(false);
    if (onRestoreBackup) {
      onRestoreBackup(encryptionKey);
    }
  };

  const handleVerifyBackup = () => {
    if (onVerifyBackup) {
      onVerifyBackup();
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
              <Shield size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Secure Backup</h2>
              <p className="text-gray-400 text-sm">End-to-end encrypted backups</p>
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
          {/* Backup Status */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <Database size={18} className="text-[#00a884]" />
              </div>
              <div>
                <p className="text-white font-medium">Last Backup</p>
                <p className="text-gray-400 text-sm">
                  {backupStatus.lastBackup 
                    ? new Date(backupStatus.lastBackup).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[#1a2e35] rounded p-2 text-center">
                <p className="text-white font-bold">{backupStatus.chats || 0}</p>
                <p className="text-gray-500 text-xs">Chats</p>
              </div>
              <div className="bg-[#1a2e35] rounded p-2 text-center">
                <p className="text-white font-bold">{backupStatus.size || '0 MB'}</p>
                <p className="text-gray-500 text-xs">Size</p>
              </div>
            </div>
          </div>

          {/* Encryption Status */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className="text-green-500" />
              <p className="text-white font-medium">Encryption Status</p>
            </div>
            <p className="text-gray-400 text-sm">
              {backupStatus.encrypted ? 'Backup is end-to-end encrypted' : 'Backup is not encrypted'}
            </p>
            {backupStatus.encrypted && (
              <button
                onClick={handleVerifyBackup}
                className="mt-2 text-[#00a884] text-sm hover:underline"
              >
                Verify encryption key
              </button>
            )}
          </div>

          {/* Create Backup */}
          <button
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Creating... {backupProgress}%
              </>
            ) : (
              <>
                <Cloud size={18} />
                Create Encrypted Backup
              </>
            )}
          </button>

          {/* Restore Backup */}
          <button
            onClick={handleRestoreBackup}
            disabled={isRestoring}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Restoring... {restoreProgress}%
              </>
            ) : (
              <>
                <HardDrive size={18} />
                Restore from Backup
              </>
            )}
          </button>

          {/* Encryption Key Input */}
          <AnimatePresence>
            {showKeyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Key size={18} className="text-[#00a884]" />
                  <p className="text-white font-medium">Enter Encryption Key</p>
                </div>
                <input
                  type="password"
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  placeholder="Enter your backup encryption key"
                  className="w-full bg-[#1a2e35] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowKeyInput(false)}
                    className="flex-1 bg-[#1a2e35] text-white py-2 rounded-lg hover:bg-[#0b141a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestoreBackup}
                    disabled={!encryptionKey}
                    className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    Restore
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Secure backups use end-to-end encryption. Make sure to save your encryption key in a safe place. Without it, you cannot restore your backup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Secure Backup Settings Component
export const SecureBackupSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Secure Backup
          </p>
          <p className="text-gray-400 text-sm">End-to-end encrypted backups</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, secureBackupEnabled: !settings.secureBackupEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.secureBackupEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.secureBackupEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.secureBackupEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-backup</p>
              <p className="text-gray-400 text-xs">Automatic encrypted backups</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoSecureBackup: !settings.autoSecureBackup })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoSecureBackup ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoSecureBackup ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Backup frequency</p>
            <select
              value={settings.secureBackupFrequency || 'daily'}
              onChange={(e) => onUpdate({ ...settings, secureBackupFrequency: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Include media</p>
              <p className="text-gray-400 text-xs">Backup photos and videos</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, secureBackupMedia: !settings.secureBackupMedia })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.secureBackupMedia ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.secureBackupMedia ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Cloud storage</p>
              <p className="text-gray-400 text-xs">Use cloud for backups</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, secureBackupCloud: !settings.secureBackupCloud })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.secureBackupCloud ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.secureBackupCloud ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Backup Encryption Key Component
export const BackupEncryptionKey = ({ key, onGenerate, onCopy, onReset }) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <Key size={18} className="text-[#00a884]" />
        <p className="text-white font-medium">Backup Encryption Key</p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-gray-400 text-xs mb-1">Your encryption key</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-[#1a2e35] px-3 py-2 rounded text-sm font-mono break-all">
              {showKey ? key : '••••••••••••••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            className="flex-1 bg-[#00a884] text-white py-2 rounded hover:bg-[#008f72] transition-colors text-sm"
          >
            Generate New Key
          </button>
          <button
            onClick={() => onCopy?.(key)}
            className="flex-1 bg-[#0b141a] text-white py-2 rounded hover:bg-[#1a2e35] transition-colors text-sm"
          >
            Copy Key
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-red-500/20 text-red-500 py-2 rounded hover:bg-red-500/30 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
          <p className="text-yellow-500 text-xs">
            Store this key securely. Without it, you cannot restore your encrypted backup.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureBackup;
