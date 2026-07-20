import React, { useState, useEffect } from 'react';
import { Video, X, Mic, MicOff, Video as VideoIcon, VideoOff, RefreshCw, Signal, Clock, User, Monitor, Maximize, Minimize, AlertCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoCall = ({ call, onMute, onUnmute, onVideoToggle, onEndCall, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended

  useEffect(() => {
    if (callStatus === 'connected') {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStatus]);

  useEffect(() => {
    setTimeout(() => setCallStatus('connected'), 2000);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      onUnmute?.(call._id);
    } else {
      onMute?.(call._id);
    }
  };

  const handleVideoToggle = () => {
    setIsVideoOn(!isVideoOn);
    onVideoToggle?.(call._id, !isVideoOn);
  };

  const handleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onEndCall?.(call._id);
      onClose();
    }, 1000);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 bg-black z-50 flex flex-col ${isFullscreen ? 'p-0' : 'p-4'}`}
    >
      {/* Main Video Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote Video */}
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          {callStatus === 'connecting' ? (
            <div className="text-center">
              <RefreshCw className="animate-spin text-[#00a884] mx-auto mb-4" size={48} />
              <p className="text-white text-lg">Connecting...</p>
            </div>
          ) : callStatus === 'connected' ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-32 h-32 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                <User size={64} className="text-[#00a884]" />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white text-lg">Call Ended</p>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        {isVideoOn && callStatus === 'connected' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden border-2 border-[#00a884]/30 shadow-xl"
          >
            <div className="w-full h-full bg-[#1a2e35] flex items-center justify-center">
              <User size={32} className="text-gray-400" />
            </div>
          </motion.div>
        )}

        {/* Call Info Overlay */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Signal size={16} className="text-[#00a884]" />
            <span className="text-white text-sm font-medium">{call.contactName}</span>
          </div>
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2 mt-1">
              <Clock size={14} className="text-[#00a884]" />
              <span className="text-[#00a884] text-sm">{formatDuration(callDuration)}</span>
            </div>
          )}
          {isScreenSharing && (
            <div className="flex items-center gap-2 mt-1">
              <Monitor size={14} className="text-blue-500" />
              <span className="text-blue-500 text-xs">Screen Sharing</span>
            </div>
          )}
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={handleFullscreen}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition-colors"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      {/* Call Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-6">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleMute}
            disabled={callStatus === 'ended'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-500'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${callStatus === 'ended' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button
            onClick={handleVideoToggle}
            disabled={callStatus === 'ended'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              !isVideoOn
                ? 'bg-red-500/20 text-red-500'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${callStatus === 'ended' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isVideoOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}
          </button>

          <button
            onClick={handleScreenShare}
            disabled={callStatus === 'ended'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-gray-700 text-white hover:bg-gray-600'
            } ${callStatus === 'ended' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Monitor size={24} />
          </button>

          <button
            onClick={handleEndCall}
            disabled={callStatus === 'ended'}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              callStatus === 'ended'
                ? 'bg-gray-600 text-gray-400'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <Phone size={28} />
          </button>

          <button
            disabled={callStatus === 'ended'}
            className="w-14 h-14 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Incoming Video Call Component
export const IncomingVideoCall = ({ call, onAccept, onReject, onClose }) => {
  const [permissionsNeeded, setPermissionsNeeded] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionsNeeded(false);
      } catch (error) {
        console.log('[IncomingVideoCall] Permission check failed:', error);
        setPermissionsNeeded(true);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionError('Microphone and camera access denied. Please enable in browser settings.');
        } else {
          setPermissionError('Please allow microphone and camera access to answer this call.');
        }
      }
    };

    checkPermissions();
  }, []);

  const requestPermissions = async () => {
    setIsRequestingPermission(true);
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionsNeeded(false);
    } catch (error) {
      console.error('[IncomingVideoCall] Permission request failed:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Permission denied. Please allow microphone/camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone or camera found on this device.');
      } else {
        setPermissionError('Failed to access microphone/camera. Please try again.');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleAccept = async () => {
    if (permissionsNeeded) {
      await requestPermissions();
      return;
    }
    onAccept?.(call._id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Video size={48} className="text-[#00a884]" />
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">{call.contactName}</h2>
          <p className="text-gray-400 text-sm">{call.phoneNumber}</p>
          <p className="text-[#00a884] mt-3">Incoming video call...</p>
        </div>

        {/* Permission Warning */}
        {permissionsNeeded && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 text-sm font-medium">Permissions Required</p>
                <p className="text-red-200 text-xs mt-1">
                  {permissionError || 'Please allow microphone and camera access to answer this call.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => {
              onReject?.(call._id);
              onClose();
            }}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <Phone size={28} />
          </button>

          {permissionsNeeded ? (
            <button
              onClick={requestPermissions}
              disabled={isRequestingPermission}
              className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequestingPermission ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <Mic size={14} />
                  <Camera size={14} />
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008f72] transition-colors"
            >
              <Video size={28} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Video Call Button Component
export const VideoCallButton = ({ contact, onCall }) => {
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showOutgoingCall, setShowOutgoingCall] = useState(false);

  const handleCall = () => {
    setShowOutgoingCall(true);
    onCall?.(contact._id);
  };

  return (
    <>
      <button
        onClick={handleCall}
        className="p-2 rounded-full text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Video call"
      >
        <Video size={18} />
      </button>

      <AnimatePresence>
        {showOutgoingCall && (
          <VideoCall
            call={{
              _id: contact._id,
              contactName: contact.name,
              phoneNumber: contact.phone
            }}
            onEndCall={() => setShowOutgoingCall(false)}
            onClose={() => setShowOutgoingCall(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Video Call Settings Component
export const VideoCallSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Video size={18} className="text-[#00a884]" />
            Video Calls
          </p>
          <p className="text-gray-400 text-sm">Make video calls</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, videoCallsEnabled: !settings.videoCallsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.videoCallsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.videoCallsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.videoCallsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Low data mode</p>
              <p className="text-gray-400 text-xs">Reduce video quality</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, videoLowDataMode: !settings.videoLowDataMode })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.videoLowDataMode ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.videoLowDataMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Video quality</p>
            <select
              value={settings.videoQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, videoQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="low">Low (360p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Mirror video</p>
              <p className="text-gray-400 text-xs">Flip self-view</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, mirrorVideo: !settings.mirrorVideo })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.mirrorVideo ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.mirrorVideo ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
