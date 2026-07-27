import React, { useState, useEffect } from 'react';
import { Users, X, Mic, MicOff, Video as VideoIcon, VideoOff, RefreshCw, Signal, Clock, User, Plus, Monitor, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GroupCall = ({ group, participants, onMute, onUnmute, onVideoToggle, onEndCall, onAddParticipant, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [showParticipants, setShowParticipants] = useState(false);

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
      onUnmute?.(group._id);
    } else {
      onMute?.(group._id);
    }
  };

  const handleVideoToggle = () => {
    setIsVideoOn(!isVideoOn);
    onVideoToggle?.(group._id, !isVideoOn);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onEndCall?.(group._id);
      onClose();
    }, 1000);
  };

  const activeParticipants = participants.filter(p => p.isActive);
  const speakingParticipants = participants.filter(p => p.isSpeaking);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
            <Users size={20} className="text-[#00a884]" />
          </div>
          <div>
            <h2 className="text-white font-semibold">{group.name}</h2>
            <p className="text-gray-400 text-sm">{activeParticipants.length} participants</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Users size={16} />
            <span>{activeParticipants.length}</span>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="w-full h-full grid grid-cols-2 gap-2">
          {activeParticipants.slice(0, 4).map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative bg-gray-900 rounded-lg overflow-hidden ${
                speakingParticipants.includes(participant.id) ? 'ring-2 ring-[#00a884]' : ''
              }`}
            >
              <div className="aspect-video flex items-center justify-center">
                <div className="w-16 h-16 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                  <User size={32} className="text-[#00a884]" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <p className="text-white text-sm">{participant.name}</p>
              </div>
              {speakingParticipants.includes(participant.id) && (
                <div className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1">
                  <Mic size={12} className="text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Call Status */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-2">
              <RefreshCw className="animate-spin text-[#00a884]" size={16} />
              <span className="text-white text-sm">Connecting...</span>
            </div>
          )}
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2">
              <Signal size={16} className="text-[#00a884]" />
              <Clock size={16} className="text-[#00a884]" />
              <span className="text-[#00a884] text-sm">{formatDuration(callDuration)}</span>
            </div>
          )}
          {callStatus === 'ended' && (
            <span className="text-red-500 text-sm">Call Ended</span>
          )}
        </div>
      </div>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-[#1a2e35] border-l border-[#00a884]/30 p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Participants</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {participants.map(participant => (
                <div
                  key={participant.id}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    participant.isActive
                      ? 'bg-[#00a884]/20 border border-[#00a884]'
                      : 'bg-[#0b141a] border border-[#00a884]/30'
                  }`}
                >
                  <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                    <User size={18} className="text-[#00a884]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{participant.name}</p>
                    <p className="text-gray-400 text-xs">
                      {participant.isActive ? 'In call' : 'Not in call'}
                    </p>
                  </div>
                  {speakingParticipants.includes(participant.id) && (
                    <Mic size={14} className="text-[#00a884]" />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => onAddParticipant?.(group._id)}
              className="w-full mt-4 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Participant
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setShowParticipants(!showParticipants)}
            className="w-14 h-14 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <Users size={24} />
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
        </div>
      </div>
    </motion.div>
  );
};

// Group Call Button Component
export const GroupCallButton = ({ group, onCall }) => {
  const [showGroupCall, setShowGroupCall] = useState(false);

  const handleCall = () => {
    setShowGroupCall(true);
    onCall?.(group._id);
  };

  return (
    <>
      <button
        onClick={handleCall}
        className="p-2 rounded-full text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Start group call"
      >
        <Users size={18} />
      </button>

      <AnimatePresence>
        {showGroupCall && (
          <GroupCall
            group={group}
            participants={group.participants || []}
            onEndCall={() => setShowGroupCall(false)}
            onClose={() => setShowGroupCall(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Group Call Settings Component
export const GroupCallSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Users size={18} className="text-[#00a884]" />
            Group Calls
          </p>
          <p className="text-gray-400 text-sm">Call multiple participants</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, groupCallsEnabled: !settings.groupCallsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.groupCallsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.groupCallsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.groupCallsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Max participants</p>
            <select
              value={settings.maxGroupCallParticipants || '8'}
              onChange={(e) => onUpdate({ ...settings, maxGroupCallParticipants: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="4">4 participants</option>
              <option value="8">8 participants</option>
              <option value="16">16 participants</option>
              <option value="32">32 participants</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-add participants</p>
              <p className="text-gray-400 text-xs">Add all group members</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoAddParticipants: !settings.autoAddParticipants })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoAddParticipants ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoAddParticipants ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Speaker view</p>
              <p className="text-gray-400 text-xs">Highlight active speaker</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, speakerView: !settings.speakerView })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.speakerView ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.speakerView ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Group Call Invitation Component
export const GroupCallInvitation = ({ group, onAccept, onReject, onClose }) => {
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
            <Users size={48} className="text-[#00a884]" />
          </div>
          <h2 className="text-white text-2xl font-semibold mb-2">{group.name}</h2>
          <p className="text-gray-400 text-sm">Group call started</p>
          <p className="text-[#00a884] mt-3">{group.participantCount} participants</p>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => {
              onReject?.(group._id);
              onClose();
            }}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <Phone size={28} />
          </button>

          <button
            onClick={() => {
              onAccept?.(group._id);
              onClose();
            }}
            className="w-16 h-16 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#008f72] transition-colors"
          >
            <Users size={28} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GroupCall;
