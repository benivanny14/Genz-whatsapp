import React from 'react';
import { ArrowLeft, ShieldCheck, KeyRound, Lock, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecuritySettings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to settings">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <KeyRound className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Security</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                  Manage your account security preferences.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Security notifications</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Get alerts about security events</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Passkeys</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in securely without a password</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-step verification</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Two-step verification has been removed from GENZ.
                  For enhanced security, use passkeys instead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
