import React, { useState } from 'react';
import { Trash2, Shield, AlertTriangle, X, Check, Download, RefreshCw, UserPlus, Link as LinkIcon, Sync, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AccountDelete = ({ onDeleteAccount, onClose }) => {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const reasons = [
    'Not using anymore',
    'Switching to another app',
    'Privacy concerns',
    'Too many ads',
    'Technical issues',
    'Other'
  ];

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setIsDeleting(true);
    
    // Simulate deletion process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (onDeleteAccount) {
      onDeleteAccount({ reason, feedback });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Trash2 className="text-red-500" />
            Delete Account
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Step 1: Warning */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-medium mb-2">Warning</p>
                  <p className="text-gray-300 text-sm">
                    Deleting your account is permanent. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0b141a] rounded-lg p-4 space-y-3">
              <p className="text-white font-medium">What will be deleted:</p>
              <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                  All your messages and chats
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                  Your profile information
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                  All media files
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                  Account settings and preferences
                </li>
              </ul>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Reason */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-white font-medium">Why are you deleting your account?</p>
            
            <div className="space-y-2">
              {reasons.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    reason === r
                      ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]'
                      : 'bg-[#0b141a] text-gray-300 hover:bg-[#1a2e35]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Additional feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more..."
                rows={3}
                className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!reason}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                Type <span className="font-bold">DELETE</span> to confirm account deletion
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE"
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-red-500/30 focus:border-red-500 focus:outline-none text-center font-bold tracking-widest"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || isDeleting}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AccountLinking = ({ linkedAccounts, onLinkAccount, onUnlinkAccount, onClose }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [accountType, setAccountType] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPhone, setAccountPhone] = useState('');

  const accountTypes = [
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'phone', name: 'Phone', icon: '📱' },
    { id: 'facebook', name: 'Facebook', icon: '📘' },
    { id: 'google', name: 'Google', icon: '🔵' },
  ];

  const handleLink = () => {
    if (!accountType || (!accountEmail && !accountPhone)) return;

    const newAccount = {
      id: Date.now(),
      type: accountType,
      email: accountEmail,
      phone: accountPhone,
      linkedAt: Date.now()
    };

    if (onLinkAccount) {
      onLinkAccount(newAccount);
    }

    setShowLinkModal(false);
    setAccountType('');
    setAccountEmail('');
    setAccountPhone('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <LinkIcon className="text-[#00a884]" />
            Linked Accounts
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Linked Accounts List */}
        <div className="space-y-3 mb-6">
          {linkedAccounts.map(account => (
            <div key={account.id} className="bg-[#0b141a] rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00a884]/20 rounded-lg flex items-center justify-center text-2xl">
                  {accountTypes.find(t => t.id === account.type)?.icon}
                </div>
                <div>
                  <p className="text-white font-medium">{accountTypes.find(t => t.id === account.type)?.name}</p>
                  <p className="text-gray-400 text-sm">{account.email || account.phone}</p>
                </div>
              </div>
              <button
                onClick={() => onUnlinkAccount(account.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ))}

          {linkedAccounts.length === 0 && (
            <div className="text-center py-8 bg-[#0b141a] rounded-lg">
              <LinkIcon className="text-gray-600 mx-auto mb-2" size={32} />
              <p className="text-gray-400 text-sm">No linked accounts</p>
            </div>
          )}
        </div>

        {/* Link New Account */}
        {!showLinkModal ? (
          <button
            onClick={() => setShowLinkModal(true)}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Link Account
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                <option value="">Select type</option>
                {accountTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            {accountType === 'email' && (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
              </div>
            )}

            {accountType === 'phone' && (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  value={accountPhone}
                  onChange={(e) => setAccountPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!accountType || (!accountEmail && !accountPhone)}
                className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Link
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AccountSync = ({ syncSettings, onSyncSettingsChange, onSyncNow, onClose }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setLastSync(Date.now());
    setIsSyncing(false);
    
    if (onSyncNow) {
      onSyncNow();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Sync className="text-[#00a884]" />
            Account Sync
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Sync Status */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Last sync</span>
            <span className="text-white text-sm">
              {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Status</span>
            <span className={`text-sm ${isSyncing ? 'text-[#00a884]' : 'text-green-400'}`}>
              {isSyncing ? 'Syncing...' : 'Up to date'}
            </span>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto sync</p>
              <p className="text-gray-400 text-xs">Sync automatically</p>
            </div>
            <button
              onClick={() => onSyncSettingsChange({ ...syncSettings, autoSync: !syncSettings.autoSync })}
              className={`w-12 h-6 rounded-full transition-all ${
                syncSettings.autoSync ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  syncSettings.autoSync ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {syncSettings.autoSync && (
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sync frequency</label>
              <select
                value={syncSettings.syncFrequency || 'hourly'}
                onChange={(e) => onSyncSettingsChange({ ...syncSettings, syncFrequency: e.target.value })}
                className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sync over Wi-Fi only</p>
              <p className="text-gray-400 text-xs">Save mobile data</p>
            </div>
            <button
              onClick={() => onSyncSettingsChange({ ...syncSettings, wifiOnly: !syncSettings.wifiOnly })}
              className={`w-12 h-6 rounded-full transition-all ${
                syncSettings.wifiOnly ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  syncSettings.wifiOnly ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sync contacts</p>
              <p className="text-gray-400 text-xs">Keep contacts updated</p>
            </div>
            <button
              onClick={() => onSyncSettingsChange({ ...syncSettings, syncContacts: !syncSettings.syncContacts })}
              className={`w-12 h-6 rounded-full transition-all ${
                syncSettings.syncContacts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  syncSettings.syncContacts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sync chats</p>
              <p className="text-gray-400 text-xs">Backup chat history</p>
            </div>
            <button
              onClick={() => onSyncSettingsChange({ ...syncSettings, syncChats: !syncSettings.syncChats })}
              className={`w-12 h-6 rounded-full transition-all ${
                syncSettings.syncChats ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  syncSettings.syncChats ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="animate-spin" size={20} />
              Syncing...
            </>
          ) : (
            <>
              <Sync size={20} />
              Sync Now
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Account Management Settings Component
export const AccountManagementSettings = ({ settings, onUpdate }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Account Sync */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Sync size={18} className="text-[#00a884]" />
            Account Sync
          </p>
          <p className="text-gray-400 text-sm">Sync your account data</p>
        </div>
        <button
          onClick={() => setShowSyncModal(true)}
          className="bg-[#0b141a] text-white px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
        >
          Manage
        </button>
      </div>

      {/* Linked Accounts */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <LinkIcon size={18} className="text-[#00a884]" />
            Linked Accounts
          </p>
          <p className="text-gray-400 text-sm">Manage linked accounts</p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          className="bg-[#0b141a] text-white px-4 py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
        >
          Manage
        </button>
      </div>

      {/* Delete Account */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Trash2 size={18} className="text-red-500" />
            Delete Account
          </p>
          <p className="text-gray-400 text-sm">Permanently delete your account</p>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
        >
          Delete
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDeleteModal && (
          <AccountDelete
            onDeleteAccount={(data) => {
              console.log('Account deleted:', data);
              setShowDeleteModal(false);
            }}
            onClose={() => setShowDeleteModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLinkModal && (
          <AccountLinking
            linkedAccounts={settings.linkedAccounts || []}
            onLinkAccount={(account) => {
              onUpdate({ ...settings, linkedAccounts: [...(settings.linkedAccounts || []), account] });
            }}
            onUnlinkAccount={(accountId) => {
              onUpdate({ ...settings, linkedAccounts: settings.linkedAccounts?.filter(a => a.id !== accountId) || [] });
            }}
            onClose={() => setShowLinkModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSyncModal && (
          <AccountSync
            syncSettings={settings.syncSettings || { autoSync: false, wifiOnly: true, syncContacts: true, syncChats: true }}
            onSyncSettingsChange={(newSettings) => onUpdate({ ...settings, syncSettings: newSettings })}
            onSyncNow={() => console.log('Sync triggered')}
            onClose={() => setShowSyncModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export { AccountDelete, AccountLinking, AccountSync };
export default AccountManagementSettings;
