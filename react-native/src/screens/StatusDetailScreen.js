import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { getPlayablePath, playStatusAudio, stopStatusAudio } from '../utils/audio';

const formatDuration = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const StatusDetailScreen = ({ route, navigation }) => {
  const status = route.params?.status || null;
  const statusId = route.params?.statusId;

  const fallbackStatus = {
    id: statusId || 'unknown',
    user: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    content: 'https://picsum.photos/400/600',
    type: 'image',
    time: '2 hours ago',
    viewers: 15
  };

  const current = status || fallbackStatus;
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const videoRef = useRef(null);
  const trim = current.trim || null;

  useEffect(() => {
    return () => stopStatusAudio();
  }, []);

  // Start/pause the attached music together with the video player controls.
  const syncMusicWithVideo = (playing) => {
    setVideoPlaying(playing);
    if (!current.music) return;
    if (playing) {
      if (isPlaying) return;
      setLoadingMusic(true);
      setMusicError(false);
      getPlayablePath(current.music.uri)
        .then(path => {
          playStatusAudio(path, {
            onStart: () => {
              setIsPlaying(true);
              setLoadingMusic(false);
            },
            onEnd: () => setIsPlaying(false),
            onError: () => {
              setLoadingMusic(false);
              setMusicError(true);
            }
          });
        })
        .catch(() => {
          setLoadingMusic(false);
          setMusicError(true);
        });
    } else {
      stopStatusAudio();
      setIsPlaying(false);
    }
  };

  const handleVideoLoad = () => {
    if (trim && videoRef.current) {
      videoRef.current.seek(trim.start);
    }
  };

  const handleVideoProgress = ({ currentTime }) => {
    if (trim && videoPlaying && currentTime >= trim.end) {
      setVideoPlaying(false);
      if (videoRef.current) videoRef.current.seek(trim.start);
    }
  };

  const toggleMusic = async () => {
    if (isPlaying) {
      stopStatusAudio();
      setIsPlaying(false);
      return;
    }
    try {
      setLoadingMusic(true);
      setMusicError(false);
      const path = await getPlayablePath(current.music.uri);
      playStatusAudio(path, {
        onStart: () => {
          setIsPlaying(true);
          setLoadingMusic(false);
        },
        onEnd: () => setIsPlaying(false),
        onError: () => {
          setLoadingMusic(false);
          setMusicError(true);
          setIsPlaying(false);
        }
      });
    } catch (error) {
      setLoadingMusic(false);
      setMusicError(true);
    }
  };

  const toggleVoice = async () => {
    if (voicePlaying) {
      stopStatusAudio();
      setVoicePlaying(false);
      return;
    }
    try {
      setLoadingVoice(true);
      setVoiceError(false);
      const path = await getPlayablePath(current.voice.uri);
      playStatusAudio(path, {
        onStart: () => {
          setVoicePlaying(true);
          setLoadingVoice(false);
        },
        onEnd: () => setVoicePlaying(false),
        onError: () => {
          setLoadingVoice(false);
          setVoiceError(true);
          setVoicePlaying(false);
        }
      });
    } catch (error) {
      setLoadingVoice(false);
      setVoiceError(true);
    }
  };

  const handleReply = () => {
    if (replyText.trim()) {
      console.log('Reply sent:', replyText);
      setReplyText('');
      setShowReply(false);
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) stopStatusAudio();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={{ uri: current.avatar }} style={styles.headerAvatar} />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{current.user}</Text>
            <Text style={styles.headerTime}>{current.time}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleMute}>
          <Icon name={isMuted ? 'volume-off' : 'volume-up'} size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        {current.type === 'video' && current.content ? (
          <Video
            ref={videoRef}
            source={{ uri: current.content }}
            style={styles.statusImage}
            resizeMode="contain"
            controls
            paused={!videoPlaying}
            repeat={false}
            progressUpdateInterval={250}
            onLoad={handleVideoLoad}
            onProgress={handleVideoProgress}
            onPlaybackRateChange={({ playbackRate }) => syncMusicWithVideo(playbackRate > 0)}
            onEnd={() => syncMusicWithVideo(false)}
          />
        ) : current.type === 'text' ? (
          <View
            style={[
              styles.textStatusContainer,
              { backgroundColor: current.color || '#075E54' }
            ]}
          >
            <Text style={styles.textStatusText}>{current.text}</Text>
          </View>
        ) : current.content ? (
          <View style={styles.imagePreviewWrap}>
            <Image
              source={{ uri: current.content }}
              style={styles.statusImage}
              resizeMode="contain"
            />
            {current.text ? (
              <View style={styles.captionStrip}>
                <Text style={[styles.captionText, { color: current.color || '#fff' }]}>
                  {current.text}
                </Text>
              </View>
            ) : null}
          </View>
        ) : current.type === 'voice' || current.voice ? (
          <View style={styles.audioStatusPlaceholder}>
            <TouchableOpacity
              style={styles.audioStatusCircle}
              onPress={toggleVoice}
              disabled={loadingVoice}
            >
              {loadingVoice ? (
                <ActivityIndicator color="#00a884" />
              ) : (
                <Icon
                  name={voicePlaying ? 'pause' : 'mic'}
                  size={52}
                  color="#00a884"
                />
              )}
            </TouchableOpacity>
            <Text style={styles.audioStatusTitle} numberOfLines={2}>
              {current.voice ? current.voice.name : 'Voice note'}
            </Text>
            {current.voice && current.voice.duration > 0 && (
              <Text style={styles.audioStatusHint}>
                {formatDuration(current.voice.duration)}
              </Text>
            )}
            {voiceError && (
              <Text style={styles.audioStatusError}>Could not play this voice note</Text>
            )}
          </View>
        ) : (
          <View style={styles.musicStatusPlaceholder}>
            <Icon name="music-note" size={72} color="#00a884" />
            <Text style={styles.musicStatusTitle} numberOfLines={2}>
              {current.music ? current.music.name : 'Music Status'}
            </Text>
          </View>
        )}
      </View>

      {current.music && (
        <View style={styles.musicBar}>
          <TouchableOpacity
            style={styles.musicPlayButton}
            onPress={toggleMusic}
            disabled={loadingMusic}
          >
            {loadingMusic ? (
              <ActivityIndicator color="#0b141a" />
            ) : (
              <Icon name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#0b141a" />
            )}
          </TouchableOpacity>
          <View style={styles.musicBarText}>
            <Text style={styles.musicBarName} numberOfLines={1}>
              {current.music.name}
            </Text>
            <Text style={styles.musicBarHint}>
              {musicError
                ? 'Could not play this music'
                : isPlaying
                ? 'Playing...'
                : 'Status music'}
            </Text>
          </View>
        </View>
      )}

      {current.voice && current.type !== 'voice' && (
        <View style={styles.musicBar}>
          <TouchableOpacity
            style={styles.musicPlayButton}
            onPress={toggleVoice}
            disabled={loadingVoice}
          >
            {loadingVoice ? (
              <ActivityIndicator color="#0b141a" />
            ) : (
              <Icon name={voicePlaying ? 'pause' : 'mic'} size={28} color="#0b141a" />
            )}
          </TouchableOpacity>
          <View style={styles.musicBarText}>
            <Text style={styles.musicBarName} numberOfLines={1}>
              {current.voice.name}
            </Text>
            <Text style={styles.musicBarHint}>
              {voiceError
                ? 'Could not play this voice note'
                : voicePlaying
                ? 'Playing...'
                : current.voice.duration > 0
                ? formatDuration(current.voice.duration)
                : 'Voice note'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => setShowReply(true)}
        >
          <Icon name="send" size={20} color="#fff" />
          <Text style={styles.replyButtonText}>Send reply</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showReply}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReply(false)}
      >
        <View style={styles.replyModal}>
          <View style={styles.replyModalContent}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>Reply to {current.user}</Text>
              <TouchableOpacity onPress={() => setShowReply(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              placeholderTextColor="#666"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity style={styles.sendReplyButton} onPress={handleReply}>
              <Text style={styles.sendReplyButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  headerText: {
    flex: 1
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  headerTime: {
    fontSize: 12,
    color: '#666'
  },
  iconButton: {
    padding: 8
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  statusImage: {
    width: '100%',
    height: '100%'
  },
  imagePreviewWrap: {
    width: '100%',
    height: '100%'
  },
  captionStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 12
  },
  captionText: {
    fontSize: 16,
    fontWeight: '600'
  },
  textStatusContainer: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28
  },
  textStatusText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center'
  },
  musicStatusPlaceholder: {
    alignItems: 'center',
    padding: 24
  },
  musicStatusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16
  },
  audioStatusPlaceholder: {
    alignItems: 'center',
    padding: 24
  },
  audioStatusCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1a2e35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00a884'
  },
  audioStatusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16
  },
  audioStatusHint: {
    color: '#00a884',
    fontSize: 14,
    marginTop: 4
  },
  audioStatusError: {
    color: '#e53935',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center'
  },
  musicBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e35',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10
  },
  musicPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  musicBarText: {
    flex: 1
  },
  musicBarName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  musicBarHint: {
    color: '#00a884',
    fontSize: 12,
    marginTop: 2
  },
  footer: {
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a884',
    padding: 16,
    borderRadius: 8
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  replyModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  replyModalContent: {
    backgroundColor: '#1a2e35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  replyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  replyInput: {
    backgroundColor: '#0b141a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16
  },
  sendReplyButton: {
    backgroundColor: '#00a884',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  sendReplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default StatusDetailScreen;
