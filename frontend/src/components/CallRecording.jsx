import React, { useState, useEffect } from 'react';
import { Mic, X, Play, Pause, Download, Trash2, RefreshCw, Check, AlertCircle, FileText, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallRecording = ({ call, onStartRecording, onStopRecording, onDownload, onDelete, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    if (onStartRecording) {
      onStartRecording(call._id);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    const newRecording = {
      id: Date.now(),
      callId: call._id,
      duration: recordingDuration,
      timestamp: new Date().toISOString(),
      size: `${(recordingDuration * 0.1).toFixed(1)} MB`
    };
    setRecordings([...recordings, newRecording]);
    setRecordingDuration(0);
    if (onStopRecording) {
      onStopRecording(call._id, newRecording);
    }
  };

  const handleDownload = (recording) => {
    if (onDownload) {
      onDownload(recording.id);
    }
  };

  const handleDelete = (recordingId) => {
    setRecordings(recordings.filter(r => r.id !== recordingId));
    if (onDelete) {
      onDelete(recordingId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Mic size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Call Recording</h2>
              <p className="text-gray-400 text-sm">{call.contactName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Recording Controls */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            {isRecording ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-500 font-medium">Recording...</span>
                </div>
                <p className="text-white text-2xl font-bold mb-4">{formatDuration(recordingDuration)}</p>
                <button
                  onClick={handleStopRecording}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Pause size={18} />
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">Record this call for future reference</p>
                <button
                  onClick={handleStartRecording}
                  className="bg-[#00a884] text-white px-6 py-2 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Mic size={18} />
                  Start Recording
                </button>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-500 text-xs">
                Recording calls may require consent from all participants. Make sure to comply with local laws and regulations.
              </p>
            </div>
          </div>

          {/* Recordings List */}
          {recordings.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FileText size={18} className="text-[#00a884]" />
                Recordings ({recordings.length})
              </h3>
              <div className="space-y-2">
                {recordings.map(recording => (
                  <motion.div
                    key={recording.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
                          <FileText size={18} className="text-[#00a884]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">Recording</span>
                            <span className="text-gray-500 text-xs">{recording.size}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <Timer size={12} />
                            <span>{formatDuration(recording.duration)}</span>
                            <span>•</span>
                            <span>{new Date(recording.timestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(recording)}
                          className="text-[#00a884] hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(recording.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Recording Button Component
export const RecordingButton = ({ call, onRecord, onStop }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleRecord = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      onStop?.(call._id);
    } else {
      onRecord?.(call._id);
    }
  };

  return (
    <>
      <button
        onClick={handleRecord}
        className={`p-2 rounded-full transition-colors ${
          isRecording
            ? 'text-red-500 hover:bg-red-500/10 animate-pulse'
            : 'text-gray-400 hover:text-white'
        }`}
        title={isRecording ? 'Stop recording' : 'Record call'}
      >
        <Mic size={18} />
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <CallRecording
              call={call}
              onStartRecording={() => {
                onRecord?.(call._id);
                setShowModal(false);
              }}
              onStopRecording={() => {
                onStop?.(call._id);
                setShowModal(false);
              }}
              onClose={() => setShowModal(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Recording Indicator Component
export const RecordingIndicator = ({ isRecording, onStop }) => {
  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-red-500/20 border border-red-500 rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-500 text-sm">Recording</span>
          <button
            onClick={onStop}
            className="text-red-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Recording Settings Component
export const RecordingSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Mic size={18} className="text-[#00a884]" />
            Call Recording
          </p>
          <p className="text-gray-400 text-sm">Record calls</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, callRecordingEnabled: !settings.callRecordingEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.callRecordingEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.callRecordingEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.callRecordingEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-record calls</p>
              <p className="text-gray-400 text-xs">Record all calls automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoRecordCalls: !settings.autoRecordCalls })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoRecordCalls ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoRecordCalls ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Recording quality</p>
            <select
              value={settings.recordingQuality || 'high'}
              onChange={(e) => onUpdate({ ...settings, recordingQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="low">Low (64 kbps)</option>
              <option value="medium">Medium (128 kbps)</option>
              <option value="high">High (256 kbps)</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Storage location</p>
            <select
              value={settings.recordingStorage || 'local'}
              onChange={(e) => onUpdate({ ...settings, recordingStorage: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="local">Local Storage</option>
              <option value="cloud">Cloud Storage</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-delete old recordings</p>
              <p className="text-gray-400 text-xs">Remove recordings after 30 days</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDeleteRecordings: !settings.autoDeleteRecordings })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDeleteRecordings ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDeleteRecordings ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Recordings Library Component
export const RecordingsLibrary = ({ recordings, onPlay, onDownload, onDelete }) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <FileText size={18} className="text-[#00a884]" />
        Recordings ({recordings.length})
      </h3>

      <div className="space-y-2">
        {recordings.map(recording => (
          <motion.div
            key={recording.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{recording.contactName}</span>
                  <span className="text-gray-500 text-xs">{recording.size}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{formatDuration(recording.duration)}</span>
                  <span>•</span>
                  <span>{new Date(recording.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPlay(recording.id)}
                  className="text-[#00a884] hover:text-white transition-colors"
                  title="Play"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => onDownload(recording.id)}
                  className="text-[#00a884] hover:text-white transition-colors"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => onDelete(recording.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {recordings.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Mic className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No recordings yet</p>
        </div>
      )}
    </div>
  );
};

export default CallRecording;
