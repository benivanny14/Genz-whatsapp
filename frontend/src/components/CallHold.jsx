import React, { useState } from 'react';
import { Pause, Play, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallHold = ({ call, onHold, onUnhold, onClose }) => {
  const [isOnHold, setIsOnHold] = useState(call?.isOnHold || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleHold = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);

    if (isOnHold) {
      onUnhold?.(call._id);
      setIsOnHold(false);
    } else {
      onHold?.(call._id);
      setIsOnHold(true);
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
            {isOnHold ? (
              <Play className="text-[#00a884]" size={20} />
            ) : (
              <Pause className="text-yellow-500" size={20} />
            )}
            <h3 className="text-white font-semibold">
              {isOnHold ? 'Resume Call' : 'Hold Call'}
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
              ) : isOnHold ? (
                <Play size={24} className="text-[#00a884]" />
              ) : (
                <Pause size={24} className="text-yellow-500" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{call?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-sm">{isOnHold ? 'Call on hold' : 'Call active'}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`mb-4 p-4 rounded-lg border ${
          isOnHold 
            ? 'bg-yellow-500/10 border-yellow-500/30' 
            : 'bg-[#00a884]/10 border-[#00a884]/30'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`${isOnHold ? 'text-yellow-500' : 'text-[#00a884]'} flex-shrink-0 mt-0.5`} size={16} />
            <p className={`${isOnHold ? 'text-yellow-500' : 'text-[#00a884]'} text-sm`}>
              {isOnHold 
                ? 'The call is currently on hold. The other party cannot hear you and you cannot hear them.' 
                : 'The call is active. You can communicate normally with the other party.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleToggleHold}
          disabled={isProcessing}
          className={`w-full py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isOnHold
              ? 'bg-[#00a884] text-white hover:bg-[#008f72]'
              : 'bg-yellow-500 text-white hover:bg-yellow-600'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              {isOnHold ? <Play size={18} /> : <Pause size={18} />}
              {isOnHold ? 'Resume' : 'Hold'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Hold Button Component
export const HoldButton = ({ isOnHold, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-colors ${
        isOnHold 
          ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
          : 'bg-[#0b141a] text-gray-400 hover:text-white'
      }`}
      title={isOnHold ? 'Resume call' : 'Hold call'}
    >
      {isOnHold ? <Play size={20} /> : <Pause size={20} />}
    </button>
  );
};

// Hold Indicator Component
export const HoldIndicator = ({ isOnHold }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
        isOnHold 
          ? 'bg-yellow-500/20 text-yellow-500' 
          : 'bg-[#00a884]/20 text-[#00a884]'
      }`}
    >
      {isOnHold ? <Pause size={10} /> : <Play size={10} />}
      <span>{isOnHold ? 'On Hold' : 'Active'}</span>
    </motion.div>
  );
};

export default CallHold;
