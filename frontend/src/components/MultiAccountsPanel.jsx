import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Plus, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Switch,
  Bell,
  Inbox
} from 'lucide-react';

const MultiAccountsPanel = ({ onClose, user }) => {
  const [multiAccountsEnabled, setMultiAccountsEnabled] = useState(false);
  const [maxAccounts, setMaxAccounts] = useState(5);
  const [currentAccounts, setCurrentAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [syncSettings, setSyncSettings] = useState(false);
  const [syncChats, setSyncChats] = useState(false);
  const [syncContacts, setSyncContacts] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [switchInterval, setSwitchInterval] = useState(60);
  const [notificationsPerAccount, setNotificationsPerAccount] = useState(true);
  const [unifiedInbox, setUnifiedInbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/multi-accounts/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMultiAccountsEnabled(data.settings.multiAccountsEnabled);
        setMaxAccounts(data.settings.maxAccounts);
        setCurrentAccounts(data.settings.currentAccounts || []);
        setActiveAccountId(data.settings.activeAccountId);
        setSyncSettings(data.settings.syncSettings);
        setSyncChats(data.settings.syncChats);
        setSyncContacts(data.settings.syncContacts);
        setAutoSwitch(data.settings.autoSwitch);
        setSwitchInterval(data.settings.switchInterval);
        setNotificationsPerAccount(data.settings.notificationsPerAccount);
        setUnifiedInbox(data.settings.unifiedInbox);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/multi-accounts/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          multiAccountsEnabled,
          maxAccounts,
          currentAccounts,
          activeAccountId,
          syncSettings,
          syncChats,
          syncContacts,
          autoSwitch,
          switchInterval,
          notificationsPerAccount,
          unifiedInbox
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMultiAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/multi-accounts/enable', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMultiAccountsEnabled(true);
        setCurrentAccounts(data.settings.currentAccounts);
        setActiveAccountId(data.settings.activeAccountId);
        setSuccess('Multi accounts enabled successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to enable multi accounts');
      }
    } catch (error) {
      setError('Error enabling multi accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = (accountId) => {
    setActiveAccountId(accountId);
    const updatedAccounts = currentAccounts.map(acc => ({
      ...acc,
      isActive: acc._id === accountId
    }));
    setCurrentAccounts(updatedAccounts);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Multi-Accounts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Enable Multi-Accounts */}
          {!multiAccountsEnabled ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-medium text-gray-800">Enable Multi-Accounts</h3>
                  <p className="text-xs text-gray-600">Use multiple WhatsApp accounts in one app</p>
                </div>
              </div>
              <button
                onClick={handleEnableMultiAccounts}
                disabled={loading}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enabling...' : 'Enable Multi-Accounts'}
              </button>
            </div>
          ) : (
            <>
              {/* Current Accounts */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Current Accounts ({currentAccounts.length}/{maxAccounts})</h4>
                {currentAccounts.map((account, index) => (
                  <div
                    key={account._id || index}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      account.isActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                    }`}
                    onClick={() => handleSwitchAccount(account._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center">
                          {account.name?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{account.name}</p>
                          <p className="text-xs text-gray-500">{account.phoneNumber || 'No phone'}</p>
                        </div>
                      </div>
                      {account.isActive && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </div>
                ))}
                {currentAccounts.length < maxAccounts && (
                  <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Account
                  </button>
                )}
              </div>

              {/* Sync Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Sync Settings</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Sync settings</p>
                    <p className="text-xs text-gray-500">Sync settings across accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncSettings}
                    onChange={(e) => setSyncSettings(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Sync chats</p>
                    <p className="text-xs text-gray-500">Sync chat history across accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncChats}
                    onChange={(e) => setSyncChats(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Sync contacts</p>
                    <p className="text-xs text-gray-500">Sync contacts across accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncContacts}
                    onChange={(e) => setSyncContacts(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* Auto-Switch */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Auto-Switch</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Auto-switch accounts</p>
                    <p className="text-xs text-gray-500">Automatically switch between accounts</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSwitch}
                    onChange={(e) => setAutoSwitch(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                {autoSwitch && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-800 mb-1 block">Switch interval (minutes)</label>
                    <input
                      type="number"
                      value={switchInterval}
                      onChange={(e) => setSwitchInterval(parseInt(e.target.value))}
                      min="1"
                      max="1440"
                      className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Notifications</h4>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Per-account notifications</p>
                    <p className="text-xs text-gray-500">Separate notifications for each account</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsPerAccount}
                    onChange={(e) => setNotificationsPerAccount(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <p className="text-sm text-gray-800">Unified inbox</p>
                    <p className="text-xs text-gray-500">Show all messages in one inbox</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={unifiedInbox}
                    onChange={(e) => setUnifiedInbox(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {multiAccountsEnabled && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MultiAccountsPanel;
