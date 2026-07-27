import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, Clock, Shield, Check, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatLock = ({ chat, onLockChat, onUnlockChat, onLockSettings, isLocked }) => {
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockType, setLockType] = useState('pin'); // 'pin' or 'fingerprint'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [lockDuration, setLockDuration] = useState('immediate'); // 'immediate', '1min', '5min', '1hour'
  const [step, setStep] = useState(1); // 1: select type, 2: set pin, 3: confirm pin

  const durations = [
    { value: 'immediate', label: 'Immediately', icon: <Lock size={16} /> },
    { value: '1min', label: 'After 1 minute', icon: <Clock size={16} /> },
    { value: '5min', label: 'After 5 minutes', icon: <Clock size={16} /> },
    { value: '1hour', label: 'After 1 hour', icon: <Clock size={16} /> },
  ];

  const handleLock = () => {
    if (lockType === 'pin') {
      if (pin.length !== 4) return;
      if (pin !== confirmPin) return;
      
      onLockChat(chat._id, {
        type: 'pin',
        pin: pin,
        duration: lockDuration
      });
    } else {
      onLockChat(chat._id, {
        type: 'fingerprint',
        duration: lockDuration
      });
    }
    
    setShowLockModal(false);
    setPin('');
    setConfirmPin('');
    setStep(1);
  };

  const handleUnlock = () => {
    onUnlockChat(chat._id);
  };

  const handlePinChange = (value) => {
    if (value.length <= 4) {
      setPin(value);
      if (value.length === 4 && step === 2) {
        setStep(3);
      }
    }
  };

  const handleConfirmPinChange = (value) => {
    if (value.length <= 4) {
      setConfirmPin(value);
    }
  };

  const renderPinDots = (value, isConfirm = false) => {
    return (
      <div className="flex gap-3 justify-center">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full transition-all ${
              index < value.length
                ? 'bg-[#00a884]'
                : 'bg-[#1a2e35] border-2 border-[#00a884]/30'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Lock Button */}
      <button
        onClick={() => isLocked ? handleUnlock() : setShowLockModal(true)}
        className={`p-2 rounded-lg transition-all ${
          isLocked
            ? 'bg-[#00a884]/20 text-[#00a884]'
            : 'text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10'
        }`}
        title={isLocked ? 'Unlock chat' : 'Lock chat'}
      >
        {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
      </button>

      {/* Lock Modal */}
      <AnimatePresence>
        {showLockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-xl font-semibold flex items-center gap-2">
                  <Lock className="text-[#00a884]" />
                  Lock Chat
                </h3>
                <button
                  onClick={() => setShowLockModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Step 1: Select Lock Type */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">Choose how you want to lock this chat</p>
                  
                  <button
                    onClick={() => setLockType('pin')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      lockType === 'pin'
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
                        <Lock size={24} className="text-[#00a884]" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">PIN</p>
                        <p className="text-gray-400 text-sm">Require PIN to open</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setLockType('fingerprint')}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      lockType === 'fingerprint'
                        ? 'border-[#00a884] bg-[#00a884]/10'
                        : 'border-[#00a884]/30 hover:border-[#00a884]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
                        <Shield size={24} className="text-[#00a884]" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Fingerprint</p>
                        <p className="text-gray-400 text-sm">Require fingerprint</p>
                      </div>
                    </div>
                  </button>

                  <div>
                    <p className="text-white text-sm font-medium mb-3">Lock after</p>
                    <div className="grid grid-cols-2 gap-2">
                      {durations.map(duration => (
                        <button
                          key={duration.value}
                          onClick={() => setLockDuration(duration.value)}
                          className={`flex items-center gap-2 p-3 rounded-lg text-sm transition-all ${
                            lockDuration === duration.value
                              ? 'bg-[#00a884] text-white'
                              : 'bg-[#0b141a] text-gray-400 hover:text-white'
                          }`}
                        >
                          {duration.icon}
                          {duration.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Set PIN */}
              {step === 2 && lockType === 'pin' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-white font-medium mb-2">Enter PIN</p>
                    <p className="text-gray-400 text-sm">Create a 4-digit PIN</p>
                  </div>

                  <div className="flex justify-center items-center gap-2">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => handlePinChange(e.target.value)}
                      maxLength={4}
                      className="w-32 text-center text-2xl tracking-widest bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowPin(!showPin)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {renderPinDots(pin)}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={pin.length !== 4}
                      className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm PIN */}
              {step === 3 && lockType === 'pin' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-white font-medium mb-2">Confirm PIN</p>
                    <p className="text-gray-400 text-sm">Re-enter your PIN</p>
                  </div>

                  <div className="flex justify-center items-center gap-2">
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => handleConfirmPinChange(e.target.value)}
                      maxLength={4}
                      className="w-32 text-center text-2xl tracking-widest bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {renderPinDots(confirmPin, true)}

                  {confirmPin.length === 4 && pin !== confirmPin && (
                    <p className="text-red-400 text-sm text-center">PINs do not match</p>
                  )}

                  {confirmPin.length === 4 && pin === confirmPin && (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Check size={16} />
                      <span>PINs match</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleLock}
                      disabled={confirmPin.length !== 4 || pin !== confirmPin}
                      className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      Lock Chat
                    </button>
                  </div>
                </div>
              )}

              {/* Fingerprint Lock */}
              {step === 2 && lockType === 'fingerprint' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield size={40} className="text-[#00a884]" />
                    </div>
                    <p className="text-white font-medium mb-2">Fingerprint Lock</p>
                    <p className="text-gray-400 text-sm">Use your fingerprint to unlock this chat</p>
                  </div>

                  <div className="bg-[#0b141a] rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Shield size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                      <p className="text-gray-300 text-sm">
                        Your fingerprint data will be stored securely on your device and will never be shared with WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-[#0b141a] text-gray-400 py-3 rounded-lg font-medium hover:text-white transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleLock}
                      className="flex-1 bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
                    >
                      Enable Fingerprint
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Chat Lock Settings Component
export const ChatLockSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Lock size={18} className="text-[#00a884]" />
            Chat Lock
          </p>
          <p className="text-gray-400 text-sm">Lock individual chats with PIN or fingerprint</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, chatLockEnabled: !settings.chatLockEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.chatLockEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.chatLockEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.chatLockEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Default lock type</p>
              <p className="text-gray-400 text-xs">PIN or fingerprint</p>
            </div>
            <select
              value={settings.defaultLockType || 'pin'}
              onChange={(e) => onUpdate({ ...settings, defaultLockType: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="pin">PIN</option>
              <option value="fingerprint">Fingerprint</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-lock</p>
              <p className="text-gray-400 text-xs">Lock when app closes</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoLock: !settings.autoLock })}
              className="w-12 h-6 rounded-full transition-all bg-[#0b141a]"
            >
              <div className="w-5 h-5 bg-white rounded-full transition-all translate-x-0.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Hide content in notifications</p>
              <p className="text-gray-400 text-xs">Don't show message previews</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, hideLockedContent: !settings.hideLockedContent })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.hideLockedContent ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.hideLockedContent ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Locked Chat Placeholder Component
export const LockedChatPlaceholder = ({ chat, onUnlock }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
      <div className="text-center">
        <div className="w-24 h-24 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={48} className="text-[#00a884]" />
        </div>
        <h3 className="text-white text-xl font-semibold mb-2">Chat is locked</h3>
        <p className="text-gray-400 text-sm mb-4">
          This chat is locked with {chat.lockType === 'pin' ? 'PIN' : 'fingerprint'}
        </p>
        <button
          onClick={onUnlock}
          className="bg-[#00a884] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center gap-2 mx-auto"
        >
          <Unlock size={20} />
          Unlock Chat
        </button>
      </div>
    </div>
  );
};

export default ChatLock;
