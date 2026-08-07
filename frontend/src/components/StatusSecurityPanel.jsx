import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Eye, EyeOff, Fingerprint, AlertTriangle, CheckCircle } from 'lucide-react';

const StatusSecurityPanel = ({ onClose, status, onSecurityUpdate }) => {
  const [antiScreenshot, setAntiScreenshot] = useState(false);
  const [antiScreenRecording, setAntiScreenRecording] = useState(false);
  const [passwordProtection, setPasswordProtection] = useState(false);
  const [pinProtection, setPinProtection] = useState(false);
  const [fingerprintProtection, setFingerprintProtection] = useState(false);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [screenshotDetection, setScreenshotDetection] = useState(false);
  const [screenshotNotification, setScreenshotNotification] = useState(false);

  useEffect(() => {
    // Load existing security settings for this status
    const loadSecuritySettings = () => {
      try {
        const statusSecurity = JSON.parse(localStorage.getItem('genz_status_security') || '{}');
        const statusId = status?._id || status?.id;
        if (statusId && statusSecurity[statusId]) {
          const settings = statusSecurity[statusId];
          setAntiScreenshot(settings.antiScreenshot || false);
          setAntiScreenRecording(settings.antiScreenRecording || false);
          setPasswordProtection(settings.passwordProtection || false);
          setPinProtection(settings.pinProtection || false);
          setFingerprintProtection(settings.fingerprintProtection || false);
          setPassword(settings.password || '');
          setPin(settings.pin || '');
          setScreenshotDetection(settings.screenshotDetection || false);
          setScreenshotNotification(settings.screenshotNotification || false);
        }
      } catch (error) {
        console.error('Error loading security settings:', error);
      }
    };
    loadSecuritySettings();
  }, [status]);

  const handleSave = () => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    const securitySettings = {
      antiScreenshot,
      antiScreenRecording,
      passwordProtection,
      pinProtection,
      fingerprintProtection,
      password: passwordProtection ? password : '',
      pin: pinProtection ? pin : '',
      screenshotDetection,
      screenshotNotification
    };

    try {
      const statusSecurity = JSON.parse(localStorage.getItem('genz_status_security') || '{}');
      statusSecurity[statusId] = securitySettings;
      localStorage.setItem('genz_status_security', JSON.stringify(statusSecurity));
      
      if (onSecurityUpdate) {
        onSecurityUpdate(securitySettings);
      }
      onClose();
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  };

  const applyAntiScreenshot = () => {
    // Apply FLAG_SECURE to prevent screenshots
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('user-select', 'none');
      document.documentElement.style.setProperty('-webkit-user-select', 'none');
    }
  };

  const removeAntiScreenshot = () => {
    // Remove FLAG_SECURE
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('user-select');
      document.documentElement.style.removeProperty('-webkit-user-select');
    }
  };

  useEffect(() => {
    if (antiScreenshot) {
      applyAntiScreenshot();
    } else {
      removeAntiScreenshot();
    }
  }, [antiScreenshot]);

  useEffect(() => {
    // Screenshot detection using visibility change
    let lastVisibilityState = document.visibilityState;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastVisibilityState === 'hidden') {
        // Possible screenshot taken
        if (screenshotDetection && screenshotNotification) {
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Screenshot Detected', {
              body: 'Someone may have taken a screenshot of your status',
              icon: '/icons/icon-192x192.png'
            });
          }
        }
      }
      lastVisibilityState = document.visibilityState;
    };

    if (screenshotDetection) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [screenshotDetection, screenshotNotification]);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Shield className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Status Security</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Anti-Screenshot */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <EyeOff className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Anti-Screenshot</h3>
                <p className="text-white/60 text-xs">Prevent others from taking screenshots</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={antiScreenshot}
                onChange={(e) => setAntiScreenshot(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable anti-screenshot protection</span>
            </label>
          </div>

          {/* Anti-Screen Recording */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Anti-Screen Recording</h3>
                <p className="text-white/60 text-xs">Prevent screen recording</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={antiScreenRecording}
                onChange={(e) => setAntiScreenRecording(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable anti-recording protection</span>
            </label>
          </div>

          {/* Screenshot Detection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Eye className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Screenshot Detection</h3>
                <p className="text-white/60 text-xs">Get notified when someone takes a screenshot</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenshotDetection}
                  onChange={(e) => setScreenshotDetection(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
                />
                <span className="text-white text-sm">Enable screenshot detection</span>
              </label>
              {screenshotDetection && (
                <label className="flex items-center gap-3 cursor-pointer ml-8">
                  <input
                    type="checkbox"
                    checked={screenshotNotification}
                    onChange={(e) => setScreenshotNotification(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <span className="text-white text-sm">Send notification when detected</span>
                </label>
              )}
            </div>
          </div>

          {/* Password Protection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Password Protection</h3>
                <p className="text-white/60 text-xs">Require password to view this status</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passwordProtection}
                  onChange={(e) => setPasswordProtection(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
                />
                <span className="text-white text-sm">Enable password protection</span>
              </label>
              {passwordProtection && (
                <div className="ml-8 space-y-2">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00a884]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PIN Protection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">PIN Protection</h3>
                <p className="text-white/60 text-xs">Require PIN to view this status</p>
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinProtection}
                  onChange={(e) => setPinProtection(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
                />
                <span className="text-white text-sm">Enable PIN protection</span>
              </label>
              {pinProtection && (
                <div className="ml-8 space-y-2">
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter 4-digit PIN"
                      maxLength={4}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00a884]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fingerprint Protection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Fingerprint className="text-[#00a884]" size={20} />
              <div>
                <h3 className="text-white font-medium">Fingerprint Protection</h3>
                <p className="text-white/60 text-xs">Require fingerprint to view this status</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={fingerprintProtection}
                onChange={(e) => setFingerprintProtection(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Enable fingerprint protection</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Save Security Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusSecurityPanel;
