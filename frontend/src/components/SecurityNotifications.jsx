import React, { useState } from 'react';
import { Shield, X, Bell, Check, AlertTriangle, RefreshCw, Smartphone, Lock, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SecurityNotifications = ({ settings, onUpdate, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Security Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Security Alerts</p>
              <p className="text-gray-400 text-sm">Get notified of security events</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, securityAlertsEnabled: !settings.securityAlertsEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.securityAlertsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.securityAlertsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.securityAlertsEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
              {/* Login Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">New login alerts</p>
                  <p className="text-gray-400 text-xs">Notify on new device</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, loginAlerts: !settings.loginAlerts })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.loginAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.loginAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Code Change Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Security code changes</p>
                  <p className="text-gray-400 text-xs">When encryption keys change</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, codeChangeAlerts: !settings.codeChangeAlerts })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.codeChangeAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.codeChangeAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* 2FA Alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">2FA changes</p>
                  <p className="text-gray-400 text-xs">When 2FA is modified</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, twoFactorAlerts: !settings.twoFactorAlerts })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.twoFactorAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.twoFactorAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Privacy Changes */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Privacy setting changes</p>
                  <p className="text-gray-400 text-xs">When privacy is updated</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, privacyChangeAlerts: !settings.privacyChangeAlerts })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.privacyChangeAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.privacyChangeAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Suspicious Activity */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Suspicious activity</p>
                  <p className="text-gray-400 text-xs">Unusual login attempts</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, suspiciousActivityAlerts: !settings.suspiciousActivityAlerts })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.suspiciousActivityAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.suspiciousActivityAlerts ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-blue-500 text-xs">
                Security notifications help you stay informed about important account security events.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isSaving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Security Notification Settings Component
export const SecurityNotificationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-[#00a884]" />
            Security Notifications
          </p>
          <p className="text-gray-400 text-sm">Alerts for security events</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, securityNotificationsEnabled: !settings.securityNotificationsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.securityNotificationsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.securityNotificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.securityNotificationsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Push notifications</p>
              <p className="text-gray-400 text-xs">Send to device</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, securityPushNotifications: !settings.securityPushNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.securityPushNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.securityPushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Email alerts</p>
              <p className="text-gray-400 text-xs">Send to email</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, securityEmailAlerts: !settings.securityEmailAlerts })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.securityEmailAlerts ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.securityEmailAlerts ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Security Notification Button Component
export const SecurityNotificationButton = ({ onOpen, hasAlerts }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Security notifications"
    >
      <Bell size={18} />
      {hasAlerts && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          !
        </span>
      )}
    </button>
  );
};

// Security Alert Component
export const SecurityAlert = ({ alert, onDismiss, onAction }) => {
  const alertIcons = {
    login: Smartphone,
    codeChange: Lock,
    twoFactor: Shield,
    suspicious: AlertTriangle
  };

  const Icon = alertIcons[alert.type] || Bell;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-red-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-medium">{alert.title}</p>
            <button
              onClick={() => onDismiss?.(alert.id)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-2">{alert.message}</p>
          <p className="text-gray-500 text-xs">{alert.time}</p>
        </div>
      </div>
      {alert.action && (
        <button
          onClick={() => onAction?.(alert)}
          className="mt-3 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          {alert.action}
        </button>
      )}
    </motion.div>
  );
};

// Security Alerts List Component
export const SecurityAlertsList = ({ alerts, onDismiss, onAction }) => {
  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <SecurityAlert
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  );
};

export default SecurityNotifications;
