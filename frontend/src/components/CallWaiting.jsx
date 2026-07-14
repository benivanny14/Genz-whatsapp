import React, { useState } from 'react';
import { Phone, X, Pause, Play, Check, Clock, User, Bell, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallWaiting = ({ incomingCall, currentCall, onHold, onAccept, onReject, onClose }) => {
  const [isOnHold, setIsOnHold] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);

  const handleHold = () => {
    setIsOnHold(!isOnHold);
    if (onHold) {
      onHold(currentCall._id, !isOnHold);
    }
  };

  const handleAccept = () => {
    if (onAccept) {
      onAccept(incomingCall._id);
    }
    onClose();
  };

  const handleReject = () => {
    if (onReject) {
      onReject(incomingCall._id);
    }
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="text-[#00a884] animate-pulse" size={20} />
            <h3 className="text-white font-semibold">Incoming Call</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Call on Hold */}
        {currentCall && (
          <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-yellow-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Pause size={16} className="text-yellow-500" />
              <span className="text-yellow-500 text-sm">Current call on hold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <User size={14} className="text-[#00a884]" />
              </div>
              <div>
                <p className="text-white text-sm">{currentCall.contactName}</p>
                <p className="text-gray-400 text-xs">{currentCall.duration}s</p>
              </div>
            </div>
          </div>
        )}

        {/* Incoming Call Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <User size={40} className="text-[#00a884]" />
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">{incomingCall.contactName}</h2>
          <p className="text-gray-400 text-sm">{incomingCall.phoneNumber}</p>
          <p className="text-[#00a884] mt-3">Incoming call...</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} />
            Accept & End Current
          </button>

          <button
            onClick={handleHold}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
          >
            <Pause size={18} />
            Put Current on Hold
          </button>

          <button
            onClick={handleReject}
            className="w-full bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Decline
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Call Waiting Settings Component
export const CallWaitingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Bell size={18} className="text-[#00a884]" />
            Call Waiting
          </p>
          <p className="text-gray-400 text-sm">Receive calls while on another call</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, callWaitingEnabled: !settings.callWaitingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.callWaitingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.callWaitingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.callWaitingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-accept waiting calls</p>
              <p className="text-gray-400 text-xs">Automatically accept after delay</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoAcceptWaiting: !settings.autoAcceptWaiting })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoAcceptWaiting ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoAcceptWaiting ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Waiting ringtone</p>
            <select
              value={settings.waitingRingtone || 'default'}
              onChange={(e) => onUpdate({ ...settings, waitingRingtone: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="short">Short</option>
              <option value="long">Long</option>
              <option value="vibrate">Vibrate only</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max waiting calls</p>
            <select
              value={settings.maxWaitingCalls || '2'}
              onChange={(e) => onUpdate({ ...settings, maxWaitingCalls: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="1">1 call</option>
              <option value="2">2 calls</option>
              <option value="3">3 calls</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Call Waiting Indicator Component
export const CallWaitingIndicator = ({ waitingCalls, onAccept, onReject }) => {
  return (
    <AnimatePresence>
      {waitingCalls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-yellow-500/20 border border-yellow-500 rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Bell size={16} className="text-yellow-500 animate-pulse" />
          <span className="text-yellow-500 text-sm">{waitingCalls.length} waiting</span>
          <button
            onClick={() => onAccept(waitingCalls[0].id)}
            className="text-yellow-500 hover:text-white transition-colors"
          >
            <Play size={14} />
          </button>
          <button
            onClick={() => onReject(waitingCalls[0].id)}
            className="text-yellow-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Held Call Component
export const HeldCall = ({ call, onResume, onEnd }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-yellow-500/30"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <User size={18} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium">{call.contactName}</span>
            <Pause size={14} className="text-yellow-500" />
          </div>
          <p className="text-gray-400 text-xs">On hold • {call.duration}s</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onResume(call._id)}
            className="text-[#00a884] hover:text-white transition-colors"
            title="Resume"
          >
            <Play size={16} />
          </button>
          <button
            onClick={() => onEnd(call._id)}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="End call"
          >
            <Phone size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CallWaiting;
