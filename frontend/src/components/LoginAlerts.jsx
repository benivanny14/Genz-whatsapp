import React, { useState } from 'react';
import { Smartphone, X, Check, AlertTriangle, RefreshCw, MapPin, Clock, Shield, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginAlerts = ({ loginHistory, onDismissAlert, onReviewDevice, onClose }) => {
  const [selectedAlert, setSelectedAlert] = useState(null);

  const handleReview = (alert) => {
    setSelectedAlert(alert);
    onReviewDevice?.(alert);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
              <Smartphone size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Login Alerts</h2>
              <p className="text-gray-400 text-sm">{loginHistory.length} recent logins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Login History */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {loginHistory.map((login, index) => (
              <motion.div
                key={login._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-[#0b141a] rounded-lg p-4 border ${
                  login.isSuspicious
                    ? 'border-red-500/50'
                    : login.isNew
                    ? 'border-yellow-500/50'
                    : 'border-[#00a884]/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    login.isSuspicious
                      ? 'bg-red-500/20'
                      : login.isNew
                      ? 'bg-yellow-500/20'
                      : 'bg-[#00a884]/20'
                  }`}>
                    {login.isSuspicious ? (
                      <AlertTriangle size={20} className="text-red-500" />
                    ) : login.isNew ? (
                      <Bell size={20} className="text-yellow-500" />
                    ) : (
                      <Smartphone size={20} className="text-[#00a884]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium">{login.deviceName}</p>
                      {login.isCurrent && (
                        <span className="bg-[#00a884] text-white text-xs px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{login.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTime(login.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield size={12} />
                        <span>{login.ipAddress}</span>
                      </div>
                    </div>
                    {login.isSuspicious && (
                      <button
                        onClick={() => handleReview(login)}
                        className="mt-2 text-red-500 text-sm hover:underline"
                      >
                        Review this login
                      </button>
                    )}
                  </div>
                  {!login.isCurrent && (
                    <button
                      onClick={() => onDismissAlert?.(login._id)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {loginHistory.length === 0 && (
            <div className="text-center py-12">
              <Smartphone className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No recent logins</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 border-t border-[#00a884]/20">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-blue-500 text-xs">
                Login alerts help you monitor unauthorized access to your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Login Alerts Settings Component
export const LoginAlertsSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Smartphone size={18} className="text-[#00a884]" />
            Login Alerts
          </p>
          <p className="text-gray-400 text-sm">Notify on new logins</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, loginAlertsEnabled: !settings.loginAlertsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.loginAlertsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.loginAlertsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.loginAlertsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Alert on new device</p>
              <p className="text-gray-400 text-xs">Unknown device login</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, alertOnNewDevice: !settings.alertOnNewDevice })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.alertOnNewDevice ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.alertOnNewDevice ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Alert on new location</p>
              <p className="text-gray-400 text-xs">Different location login</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, alertOnNewLocation: !settings.alertOnNewLocation })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.alertOnNewLocation ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.alertOnNewLocation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require approval</p>
              <p className="text-gray-400 text-xs">Confirm new logins</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, requireLoginApproval: !settings.requireLoginApproval })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.requireLoginApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.requireLoginApproval ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Login Alert Button Component
export const LoginAlertButton = ({ onOpen, hasUnreviewed }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Login alerts"
    >
      <Smartphone size={18} />
      {hasUnreviewed && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          !
        </span>
      )}
    </button>
  );
};

// New Login Alert Component
export const NewLoginAlert = ({ login, onApprove, onDeny }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Smartphone size={20} className="text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">New Login Detected</p>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Smartphone size={12} />
              <span>{login.deviceName}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{login.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{new Date(login.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDeny}
          className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          Deny Access
        </button>
        <button
          onClick={onApprove}
          className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
        >
          Approve
        </button>
      </div>
    </motion.div>
  );
};

// Suspicious Login Alert Component
export const SuspiciousLoginAlert = ({ login, onReview, onBlock }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-2"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Suspicious Login Activity</p>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Smartphone size={12} />
              <span>{login.deviceName}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{login.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield size={12} />
              <span>{login.ipAddress}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBlock}
          className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          Block Device
        </button>
        <button
          onClick={onReview}
          className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
        >
          Review
        </button>
      </div>
    </motion.div>
  );
};

export default LoginAlerts;
