import React, { useState } from 'react';
import { Monitor, X, Check, RefreshCw, AlertTriangle, MonitorOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallScreenShare = ({ call, onStartShare, onStopShare, onClose }) => {
  const [isSharing, setIsSharing] = useState(call?.isScreenSharing || false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleShare = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);

    if (isSharing) {
      onStopShare?.(call._id);
      setIsSharing(false);
    } else {
      onStartShare?.(call._id);
      setIsSharing(true);
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
            {isSharing ? (
              <MonitorOff className="text-red-500" size={20} />
            ) : (
              <Monitor className="text-[#00a884]" size={20} />
            )}
            <h3 className="text-white font-semibold">
              {isSharing ? 'Stop Screen Share' : 'Start Screen Share'}
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
              {isSharing ? (
                <MonitorOff size={24} className="text-red-500" />
              ) : (
                <Monitor size={24} className="text-[#00a884]" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{call?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-sm">{isSharing ? 'Screen sharing active' : 'Screen sharing off'}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`mb-4 p-4 rounded-lg border ${
          isSharing 
            ? 'bg-[#00a884]/10 border-[#00a884]/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`${isSharing ? 'text-[#00a884]' : 'text-yellow-500'} flex-shrink-0 mt-0.5`} size={16} />
            <p className={`${isSharing ? 'text-[#00a884]' : 'text-yellow-500'} text-sm`}>
              {isSharing 
                ? 'Your screen is currently being shared with the other party.' 
                : 'Your screen is not being shared. The other party cannot see your screen.'}
            </p>
          </div>
        </div>

        {/* Warning */}
        {!isSharing && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-red-500 text-xs">
                Screen sharing will allow the other party to see your entire screen. Make sure you don't have sensitive information visible.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleToggleShare}
          disabled={isProcessing}
          className={`w-full py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isSharing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#00a884] text-white hover:bg-[#008f72]'
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              {isSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              {isSharing ? 'Stop Sharing' : 'Start Sharing'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Screen Share Button Component
export const ScreenShareButton = ({ isSharing, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-colors ${
        isSharing 
          ? 'bg-[#00a884] text-white hover:bg-[#008f72]' 
          : 'bg-[#0b141a] text-gray-400 hover:text-white'
      }`}
      title={isSharing ? 'Stop screen share' : 'Start screen share'}
    >
      {isSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
    </button>
  );
};

// Screen Share Indicator Component
export const ScreenShareIndicator = ({ isSharing }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
        isSharing 
          ? 'bg-[#00a884]/20 text-[#00a884]' 
          : 'bg-gray-500/20 text-gray-400'
      }`}
    >
      {isSharing ? <Monitor size={10} /> : <MonitorOff size={10} />}
      <span>{isSharing ? 'Sharing' : 'Not Sharing'}</span>
    </motion.div>
  );
};

export default CallScreenShare;
