import React, { useState, useEffect } from 'react';
import { Phone, X, Mic, MicOff, Volume2, VolumeX, RefreshCw, Signal, Clock, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceCall = ({ call, onMute, onUnmute, onSpeaker, onEndCall, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
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
    // Simulate call connection
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

  const handleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    onSpeaker?.(call._id, !isSpeakerOn);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onEndCall?.(call._id);
      onClose();
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Signal size={20} className="text-[#00a884]" />
            <span className="text-white font-semibold">Voice Call</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Call Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-[#00a884]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={48} className="text-[#00a884]" />
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">{call.contactName}</h2>
          <p className="text-gray-400 text-sm">{call.phoneNumber}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {callStatus === 'connecting' && (
              <>
                <RefreshCw className="animate-spin text-[#00a884]" size={16} />
                <span className="text-[#00a884]">Connecting...</span>
              </>
            )}
            {callStatus === 'connected' && (
              <>
                <Clock size={16} className="text-[#00a884]" />
                <span className="text-[#00a884]">{formatDuration(callDuration)}</span>
              </>
            )}
            {callStatus === 'ended' && (
              <span className="text-red-500">Call Ended</span>
            )}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleMute}
            disabled={callStatus === 'ended'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-500'
                : 'bg-[#0b141a] text-gray-400 hover:text-white'
            } ${callStatus === 'ended' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
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
            onClick={handleSpeaker}
            disabled={callStatus === 'ended'}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isSpeakerOn
                ? 'bg-[#00a884]/20 text-[#00a884]'
                : 'bg-[#0b141a] text-gray-400 hover:text-white'
            } ${callStatus === 'ended' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        {/* Additional Options */}
        {callStatus === 'connected' && (
          <div className="flex justify-center gap-4 mt-6">
            <button className="p-3 rounded-full bg-[#0b141a] text-gray-400 hover:text-white transition-colors">
              <Keyboard size={20} />
            </button>
            <button className="p-3 rounded-full bg-[#0b141a] text-gray-400 hover:text-white transition-colors">
              <Video size={20} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Incoming Call Component
export const IncomingCall = ({ call, onAccept, onReject, onClose }) => {
  const [permissionsNeeded, setPermissionsNeeded] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionsNeeded(false);
      } catch (error) {
        console.log('[IncomingCall] Permission check failed:', error);
        setPermissionsNeeded(true);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setPermissionError('Microphone access denied. Please enable in browser settings.');
        } else {
          setPermissionError('Please allow microphone access to answer this call.');
        }
      }
    };

    checkPermissions();
  }, []);

  const requestPermissions = async () => {
    setIsRequestingPermission(true);
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionsNeeded(false);
    } catch (error) {
      console.error('[IncomingCall] Permission request failed:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No microphone found on this device.');
      } else {
        setPermissionError('Failed to access microphone. Please try again.');
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
            <User size={48} className="text-[#00a884]" />
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">{call.contactName}</h2>
          <p className="text-gray-400 text-sm">{call.phoneNumber}</p>
          <p className="text-[#00a884] mt-3">Incoming voice call...</p>
        </div>

        {/* Permission Warning */}
        {permissionsNeeded && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 text-sm font-medium">Microphone Access Required</p>
                <p className="text-red-200 text-xs mt-1">
                  {permissionError || 'Please allow microphone access to answer this call.'}
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
                <Mic size={28} />
              )}
            </button>
          ) : (
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008f72] transition-colors"
            >
              <Phone size={28} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Voice Call Button Component
export const VoiceCallButton = ({ contact, onCall }) => {
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
        title="Voice call"
      >
        <Phone size={18} />
      </button>

      <AnimatePresence>
        {showOutgoingCall && (
          <VoiceCall
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

// Voice Call Settings Component
export const VoiceCallSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Phone size={18} className="text-[#00a884]" />
            Voice Calls
          </p>
          <p className="text-gray-400 text-sm">Make voice calls</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, voiceCallsEnabled: !settings.voiceCallsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.voiceCallsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.voiceCallsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.voiceCallsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Low data mode</p>
              <p className="text-gray-400 text-xs">Reduce audio quality</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, lowDataMode: !settings.lowDataMode })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.lowDataMode ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.lowDataMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Noise cancellation</p>
              <p className="text-gray-400 text-xs">Reduce background noise</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, noiseCancellation: !settings.noiseCancellation })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.noiseCancellation ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.noiseCancellation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default audio output</p>
            <select
              value={settings.defaultAudioOutput || 'speaker'}
              onChange={(e) => onUpdate({ ...settings, defaultAudioOutput: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="speaker">Speaker</option>
              <option value="earpiece">Earpiece</option>
              <option value="bluetooth">Bluetooth</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Call History Component
export const CallHistory = ({ calls, onCallBack, onDelete }) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Clock size={18} className="text-[#00a884]" />
        Recent Calls ({calls.length})
      </h3>

      <div className="space-y-2">
        {calls.map(call => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <User size={18} className="text-[#00a884]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{call.contactName}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{call.type === 'incoming' ? 'Incoming' : 'Outgoing'}</span>
                <span>•</span>
                <span>{formatDuration(call.duration)}</span>
                <span>•</span>
                <span>{new Date(call.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onCallBack(call.contactId)}
                className="text-[#00a884] hover:text-white transition-colors"
                title="Call back"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => onDelete(call.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {calls.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Phone className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No recent calls</p>
        </div>
      )}
    </div>
  );
};

export default VoiceCall;
