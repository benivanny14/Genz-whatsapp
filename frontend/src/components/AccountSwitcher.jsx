import React, { useMemo, useState } from 'react';
import { LogIn, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { persistTokens, clearAllUserData } from '../utils/authSession';

const ACCOUNTS_KEY = 'genz_saved_accounts';

const readAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveAccounts = (accounts) => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

const getCurrentAccount = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!user || !token) return null;
    return {
      id: user._id || user.id || user.email || user.username,
      user,
      token,
      refreshToken,
      savedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
};

const AccountSwitcher = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState(() => readAccounts());
  const [message, setMessage] = useState('');
  const current = useMemo(() => getCurrentAccount(), [accounts.length]);

  const storeCurrentAccount = () => {
    const account = getCurrentAccount();
    if (!account) {
      setMessage('Login first, then save this account.');
      return;
    }
    const next = [account, ...accounts.filter((item) => String(item.id) !== String(account.id))].slice(0, 5);
    saveAccounts(next);
    setAccounts(next);
    setMessage('Current account saved.');
  };

  const switchAccount = async (account) => {
    await clearAllUserData();
    persistTokens({
      token: account.token,
      refreshToken: account.refreshToken,
      user: account.user
    });
    window.location.href = '/chat';
  };

  const removeAccount = (accountId) => {
    const next = accounts.filter((account) => String(account.id) !== String(accountId));
    saveAccounts(next);
    setAccounts(next);
  };

  const addAnotherAccount = () => {
    storeCurrentAccount();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Accounts</h2>
          <p className="text-blue-300 text-sm">Save and switch between accounts on this browser.</p>
        </div>
        <button
          type="button"
          onClick={storeCurrentAccount}
          className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500/80 text-white px-4 py-2 rounded-xl"
        >
          <RefreshCw size={16} />
          Save Current
        </button>
      </div>

      {message && (
        <div className="bg-white/10 border border-white/20 text-blue-100 rounded-xl px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={addAnotherAccount}
        className="w-full flex items-center justify-between p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/15"
      >
        <span className="flex items-center gap-3 text-white font-medium">
          <Plus size={20} className="text-green-300" />
          Add another account
        </span>
        <LogIn size={18} className="text-white/50" />
      </button>

      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-blue-200/70">
            No saved accounts yet.
          </div>
        ) : (
          accounts.map((account) => {
            const active = current && String(current.id) === String(account.id);
            return (
              <div key={account.id} className="flex items-center gap-3 p-4 bg-white/10 rounded-xl border border-white/20">
                <div className="w-11 h-11 rounded-full bg-blue-500/25 flex items-center justify-center overflow-hidden">
                  {account.user?.profilePicture ? (
                    <img src={account.user.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserRound className="text-blue-200" size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{account.user?.username || account.user?.email || 'Saved account'}</p>
                  <p className="text-blue-200/70 text-xs truncate">{account.user?.email || account.user?.phoneNumber || account.id}</p>
                </div>
                {active ? (
                  <span className="text-xs bg-green-400/15 text-green-200 px-2 py-1 rounded-full">Active</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchAccount(account)}
                    className="px-3 py-2 rounded-lg bg-blue-600/80 text-white text-sm hover:bg-blue-500/80"
                  >
                    Switch
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAccount(account.id)}
                  className="p-2 rounded-lg text-red-300 hover:bg-red-500/15"
                  title="Remove saved account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AccountSwitcher;
