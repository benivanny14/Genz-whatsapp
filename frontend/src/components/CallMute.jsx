import React, { useState } from 'react';
import { Mic, MicOff, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallMute = ({ call, onMute, onUnmute, onClose }) => {
  const [isMuted, setIsMuted] = useState(call?.isMuted || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleMute = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);

    if (isMuted) {
      onUnmute?.(call._id);
      setIsMuted(false);
    } else {
      onMute?.(call._id);
      setIsMuted(true);
    }
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
            {isMuted ? (
              <MicOff className="text-red-500" size={20} />
            ) : (
              <Mic className="text-[#00a884]" size={20} />
            )}
            <h3 className="text-white font-semibold">
              {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Call Info */}
        <div className="mb-4 p-4 bg-[#0b141a] rounded-lg border border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center">
              {call?.avatar ? (
                <img
                  src={call.avatar}
                  alt={call.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Mic size={24} className={isMuted ? 'text-red-500' : 'text-[#00a884]'} />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{call?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-sm">{isMuted ? 'Microphone muted' : 'Microphone active'}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`mb-4 p-4 rounded-lg border ${
          isMuted 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-[#00a884]/10 border-[#00a884]/30'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`${isMuted ? 'text-red-500' : 'text-[#00a884]'} flex-shrink-0 mt-0.5`} size={16} />
            <p className={`${isMuted ? 'text-red-500' : 'text-[#00a884]'} text-sm`}>
              {isMuted 
                ? 'Your microphone is currently muted. The other party cannot hear you.' 
                : 'Your microphone is active. The other party can hear you.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleToggleMute}
          disabled={isProcessing}
          className={`w-full py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isMuted
              ? 'bg-[#00a884] text-white hover:bg-[#008f72]'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              {isMuted ? <Mic size={18} /> : <MicOff size={18} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Mute Button Component
export const MuteButton = ({ isMuted, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-colors ${
        isMuted 
          ? 'bg-red-500 text-white hover:bg-red-600' 
          : 'bg-[#0b141a] text-gray-400 hover:text-white'
      }`}
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
};

// Mute Indicator Component
export const MuteIndicator = ({ isMuted }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
        isMuted 
          ? 'bg-red-500/20 text-red-500' 
          : 'bg-[#00a884]/20 text-[#00a884]'
      }`}
    >
      {isMuted ? <MicOff size={10} /> : <Mic size={10} />}
      <span>{isMuted ? 'Muted' : 'Active'}</span>
    </motion.div>
  );
};

export default CallMute;
