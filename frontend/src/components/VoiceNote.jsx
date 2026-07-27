import React, { useState, useRef, useEffect, useCallback } from 'react';

// Helper functions
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const generateWaveform = (duration) => {
  const barCount = Math.min(45, Math.max(30, Math.floor(duration * 2)));
  return Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.3);
};

// Colors - WhatsApp exact
const colors = {
  background: '#0B141A',
  headerBg: '#1F2C34',
  sentBubble: '#005C4B',
  receivedBubble: '#1F2C34',
  greenAccent: '#25D366',
  textPrimary: '#E9EDEF',
  textMuted: '#8696A0',
  blueTicks: '#53BDEB',
  inputBg: '#2A3942',
  hoverBg: '#34495E'
};

// RecordingWave sub-component
const RecordingWave = ({ isPaused }) => {
  const [bars, setBars] = useState(Array(30).fill(0.3));
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isPaused) {
      const animate = () => {
        setBars(prev => prev.map(() => Math.random() * 0.8 + 0.2));
        animationRef.current = setTimeout(animate, 150);
      };
      animate();
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPaused]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '32px' }}>
      {bars.map((height, index) => (
        <div
          key={index}
          style={{
            width: '3px',
            height: `${height * 24}px`,
            backgroundColor: colors.greenAccent,
            borderRadius: '2px',
            transition: 'height 0.1s ease'
          }}
        />
      ))}
    </div>
  );
};

// WaveformBar sub-component
const WaveformBar = ({ audioRef, playbackTime, duration, waveformData }) => {
  const seekToPosition = (e) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
  };

  const played = duration ? (playbackTime / duration) : 0;

  return (
    <div
      style={{
        flex: 1,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        cursor: 'pointer'
      }}
      onClick={seekToPosition}
    >
      {waveformData.map((height, index) => {
        const isPlayed = index / waveformData.length <= played;
        return (
          <div
            key={index}
            style={{
              width: '3px',
              height: `${height * 24}px`,
              backgroundColor: isPlayed ? colors.greenAccent : colors.textMuted,
              borderRadius: '2px',
              transition: 'background-color 0.1s'
            }}
          />
        );
      })}
    </div>
  );
};

// VoiceMessage sub-component
const VoiceMessage = ({ audioUrl, isSent, timestamp, isRead }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [waveformData, setWaveformData] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioUrl) {
      // Generate waveform based on audio duration
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setWaveformData(generateWaveform(audio.duration));
      });
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPlaybackTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  return (
    <>
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      <div style={{
        backgroundColor: isSent ? colors.sentBubble : colors.receivedBubble,
        color: colors.textPrimary,
        padding: '8px 12px',
        borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
          <button onClick={togglePlayback} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: colors.greenAccent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              {isPlaying ? '⏸' : '▶'}
            </div>
          </button>

          <WaveformBar
            audioRef={audioRef}
            playbackTime={playbackTime}
            duration={duration}
            waveformData={waveformData}
          />

          <div style={{ fontSize: '12px', color: isSent ? 'rgba(255,255,255,0.7)' : colors.textMuted }}>
            {duration ? formatTime(duration - playbackTime) : '0:00'}
          </div>

          {isSent && (
            <button
              onClick={cyclePlaybackSpeed}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.7)',
                padding: '2px'
              }}
            >
              {playbackSpeed}x
            </button>
          )}
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        gap: '4px',
        marginTop: '4px',
        marginRight: isSent ? '8px' : '0',
        marginLeft: isSent ? '0' : '8px'
      }}>
        <span style={{ fontSize: '11px', color: colors.textMuted }}>{timestamp}</span>
        {isSent && isRead && (
          <span style={{ color: colors.blueTicks, fontSize: '14px' }}>✓✓</span>
        )}
      </div>
    </>
  );
};

// VoiceRecorder sub-component
const VoiceRecorder = ({ isRecording, isLocked, isPaused, recordingTime, onStart, onStop, onPause, onDelete, onLock, onSend }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
      <div style={{
        backgroundColor: colors.headerBg,
        padding: '12px 16px',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: '#FF3B30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          animation: 'pulse 1s infinite'
        }}>
          🎤
        </div>

        <RecordingWave isPaused={isPaused} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>← Slide to cancel</span>
          <span style={{ color: colors.textPrimary, fontWeight: '500' }}>{formatTime(recordingTime)}</span>
        </div>

        {isLocked && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onDelete} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#FF3B30' }}>
              🗑️
            </button>
            <button onClick={onPause} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: colors.textPrimary }}>
              {isPaused ? '▶' : '⏸'}
            </button>
            <button onClick={onSend} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: colors.greenAccent }}>
              ➤
            </button>
          </div>
        )}

        {!isLocked && (
          <button onClick={onLock} style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: colors.textPrimary }}>
            🔒
          </button>
        )}
      </div>
    </div>
  );
};

// Main VoiceNoteApp component
const VoiceNoteApp = () => {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // UI states
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'received',
      audioUrl: null, // Would be set with actual audio
      timestamp: '10:30 AM',
      isRead: true
    },
    {
      id: 2,
      type: 'sent',
      audioUrl: null, // Would be set with actual audio
      timestamp: '10:32 AM',
      isRead: true
    }
  ]);

  // Refs
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const chunksRef = useRef([]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Add message to chat
        const newMessage = {
          id: Date.now(),
          type: 'sent',
          audioUrl: url,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isRead: false
        };
        setMessages(prev => [...prev, newMessage]);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsLocked(false);
      setIsPaused(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Pause/Resume recording
  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  // Delete recording
  const deleteRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // Send voice note
  const sendVoiceNote = () => {
    if (audioBlob) {
      console.log('Sending voice note:', audioBlob);
      // Here you would upload the blob to your server
      deleteRecording();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div style={{
      backgroundColor: colors.background,
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(37, 211, 102, 0.05) 0%, transparent 50%)'
    }}>
      {/* Chat Header */}
      <div style={{
        backgroundColor: colors.headerBg,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: colors.greenAccent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          U
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: colors.textPrimary, fontWeight: '500' }}>User</div>
          <div style={{ color: colors.textMuted, fontSize: '13px' }}>online</div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ color: colors.textPrimary, cursor: 'pointer' }}>📹</span>
          <span style={{ color: colors.textPrimary, cursor: 'pointer' }}>⋮</span>
        </div>
      </div>

      {/* Date Pill */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
        <div style={{
          backgroundColor: colors.headerBg,
          color: colors.textMuted,
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          TODAY
        </div>
      </div>

      {/* Messages */}
      <div style={{ padding: '0 16px', marginBottom: '80px' }}>
        {messages.map((message) => (
          <div key={message.id} style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
            justifyContent: message.type === 'sent' ? 'flex-end' : 'flex-start'
          }}>
            {message.type === 'received' && (
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: colors.greenAccent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                C
              </div>
            )}
            <div style={{ maxWidth: '70%' }}>
              <VoiceMessage
                audioUrl={message.audioUrl}
                isSent={message.type === 'sent'}
                timestamp={message.timestamp}
                isRead={message.isRead}
              />
            </div>
          </div>
        ))}

        {/* Recording UI */}
        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            isLocked={isLocked}
            isPaused={isPaused}
            recordingTime={recordingTime}
            onStart={startRecording}
            onStop={stopRecording}
            onPause={togglePauseRecording}
            onDelete={deleteRecording}
            onLock={() => setIsLocked(true)}
            onSend={sendVoiceNote}
          />
        )}
      </div>

      {/* Input Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.headerBg,
        padding: '12px 16px'
      }}>
        {!isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.textMuted, cursor: 'pointer' }}>😊</span>
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setIsTyping(e.target.value.length > 0);
              }}
              placeholder="Type a message"
              style={{
                flex: 1,
                backgroundColor: colors.inputBg,
                border: 'none',
                borderRadius: '20px',
                padding: '8px 12px',
                color: colors.textPrimary,
                outline: 'none'
              }}
            />
            <span style={{ color: colors.textMuted, cursor: 'pointer' }}>📎</span>
            <span style={{ color: colors.textMuted, cursor: 'pointer' }}>📷</span>
            {isTyping ? (
              <button
                onClick={() => { setInputText(''); setIsTyping(false); }}
                style={{
                  backgroundColor: colors.greenAccent,
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                ➤
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                style={{
                  backgroundColor: colors.greenAccent,
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                🎤
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={deleteRecording}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#FF3B30'
              }}
            >
              🗑️ Delete
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#FF3B30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                animation: 'pulse 1s infinite'
              }}>
                🎤
              </div>
              <span style={{ color: colors.textPrimary, fontWeight: '500' }}>{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={sendVoiceNote}
              style={{
                backgroundColor: colors.greenAccent,
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              ➤
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default VoiceNoteApp;
