import React, { useState } from 'react';
import { Video, VideoOff, X, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallVideoToggle = ({ call, onVideoOn, onVideoOff, onClose }) => {
  const [isVideoOn, setIsVideoOn] = useState(call?.isVideoOn || true);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleVideo = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);

    if (isVideoOn) {
      onVideoOff?.(call._id);
      setIsVideoOn(false);
    } else {
      onVideoOn?.(call._id);
      setIsVideoOn(true);
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
            {isVideoOn ? (
              <Video className="text-[#00a884]" size={20} />
            ) : (
              <VideoOff className="text-red-500" size={20} />
            )}
            <h3 className="text-white font-semibold">
              {isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
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
                isVideoOn ? (
                  <Video size={24} className="text-[#00a884]" />
                ) : (
                  <VideoOff size={24} className="text-red-500" />
                )
              )}
            </div>
            <div>
              <p className="text-white font-medium">{call?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-sm">{isVideoOn ? 'Video is on' : 'Video is off'}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`mb-4 p-4 rounded-lg border ${
          isVideoOn 
            ? 'bg-[#00a884]/10 border-[#00a884]/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`${isVideoOn ? 'text-[#00a884]' : 'text-red-500'} flex-shrink-0 mt-0.5`} size={16} />
            <p className={`${isVideoOn ? 'text-[#00a884]' : 'text-red-500'} text-sm`}>
              {isVideoOn 
                ? 'Your video is currently visible to the other party.' 
                : 'Your video is currently hidden. The other party cannot see you.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleToggleVideo}
          disabled={isProcessing}
          className={`w-full py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            isVideoOn
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
              {isVideoOn ? <VideoOff size={18} /> : <Video size={18} />}
              {isVideoOn ? 'Turn Off' : 'Turn On'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Video Toggle Button Component
export const VideoToggleButton = ({ isVideoOn, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full transition-colors ${
        isVideoOn 
          ? 'bg-[#0b141a] text-gray-400 hover:text-white' 
          : 'bg-red-500 text-white hover:bg-red-600'
      }`}
      title={isVideoOn ? 'Turn off video' : 'Turn on video'}
    >
      {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
    </button>
  );
};

// Video Indicator Component
export const VideoIndicator = ({ isVideoOn }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
        isVideoOn 
          ? 'bg-[#00a884]/20 text-[#00a884]' 
          : 'bg-red-500/20 text-red-500'
      }`}
    >
      {isVideoOn ? <Video size={10} /> : <VideoOff size={10} />}
      <span>{isVideoOn ? 'On' : 'Off'}</span>
    </motion.div>
  );
};

export default CallVideoToggle;
