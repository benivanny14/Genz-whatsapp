import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector, useDispatch } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Video from 'react-native-video';
import VideoTrimmer from '../components/VideoTrimmer';
import VoiceRecorderSheet from '../components/VoiceRecorderSheet';
import { setMyStatuses, addStatus } from '../store';

const STATUS_COLORS = [
  '#075E54',
  '#128C7E',
  '#25D366',
  '#34B7F1',
  '#7C4DFF',
  '#E91E63',
  '#FF6F00',
  '#0b141a'
];

const emptyDraft = {
  image: null,
  video: null,
  music: null,
  voice: null,
  text: '',
  color: '#075E54'
};

const StatusScreen = ({ navigation }) => {
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [picking, setPicking] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoPreviewPlaying, setVideoPreviewPlaying] = useState(false);
  const videoRef = useRef(null);
  const dispatch = useDispatch();
  const { myStatuses } = useSelector(state => state.status);

  const recentUpdates = [
    {
      id: 'recent-1',
      user: 'Amina',
      avatar: 'https://i.pravatar.cc/150?img=10',
      thumbnail: 'https://picsum.photos/200/300?random=1',
      content: 'https://picsum.photos/400/600?random=1',
      type: 'image',
      time: '2 hours ago',
      viewers: 15
    },
    {
      id: 'recent-2',
      user: 'Brian',
      avatar: 'https://i.pravatar.cc/150?img=11',
      thumbnail: 'https://picsum.photos/200/300?random=2',
      content: 'https://picsum.photos/400/600?random=2',
      type: 'image',
      time: 'Yesterday',
      viewers: 42
    }
  ];

  useEffect(() => {
    dispatch(setMyStatuses([]));
  }, [dispatch]);

  const handleAddStatus = () => {
    setShowAddStatus(true);
  };

  const closeComposer = () => {
    setShowComposer(false);
    setDraft(emptyDraft);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setVideoPreviewPlaying(false);
  };

  const openComposer = () => {
    setShowAddStatus(false);
    setShowComposer(true);
  };

  const pickImageFromDevice = async () => {
    try {
      setPicking(true);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false
      });
      if (result.didCancel || !result.assets || !result.assets.length) {
        return;
      }
      const asset = result.assets[0];
      setDraft(prev => ({
        ...prev,
        image: { uri: asset.uri, name: asset.fileName || 'Image' }
      }));
      openComposer();
    } catch (error) {
      Alert.alert('Error', 'Could not pick an image from the device.');
    } finally {
      setPicking(false);
    }
  };

  const pickVideoFromDevice = async () => {
    try {
      setPicking(true);
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
        includeBase64: false
      });
      if (result.didCancel || !result.assets || !result.assets.length) {
        return;
      }
      const asset = result.assets[0];
      setDraft(prev => ({
        ...prev,
        video: { uri: asset.uri, name: asset.fileName || 'Video' }
      }));
      setVideoDuration(0);
      setTrimStart(0);
      setTrimEnd(0);
      setVideoPreviewPlaying(false);
      openComposer();
    } catch (error) {
      Alert.alert('Error', 'Could not pick a video from the device.');
    } finally {
      setPicking(false);
    }
  };

  const pickMusicFromDevice = async () => {
    try {
      setPicking(true);
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        copyTo: 'cachesDirectory'
      });
      const file = res[0];
      if (!file) return;
      setDraft(prev => ({
        ...prev,
        music: {
          // fileCopyUri is a real local cache path (playable), uri is the
          // original content:// path.
          uri: file.fileCopyUri || file.uri,
          name: file.name || 'Music'
        }
      }));
      openComposer();
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      Alert.alert('Error', 'Could not pick music from the device.');
    } finally {
      setPicking(false);
    }
  };

  const pickTextStatus = () => {
    setDraft({
      image: null,
      video: null,
      music: null,
      voice: null,
      text: '',
      color: '#075E54'
    });
    openComposer();
  };

  const handleVoiceSaved = ({ uri, name, duration }) => {
    setDraft(prev => ({ ...prev, voice: { uri, name, duration } }));
    setShowVoiceRecorder(false);
    if (!showComposer) {
      setShowAddStatus(false);
      setShowComposer(true);
    }
  };

  const handleVideoLoad = ({ duration }) => {
    if (!duration || duration <= 0) return;
    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  };

  const handleVideoProgress = ({ currentTime }) => {
    if (videoPreviewPlaying && trimEnd > 0 && currentTime >= trimEnd) {
      setVideoPreviewPlaying(false);
      if (videoRef.current) videoRef.current.seek(trimStart);
    }
  };

  const toggleVideoPreview = () => {
    if (videoPreviewPlaying) {
      setVideoPreviewPlaying(false);
      return;
    }
    if (videoRef.current) videoRef.current.seek(trimStart);
    setVideoPreviewPlaying(true);
  };

  const canPost = () => {
    return Boolean(
      draft.image ||
        draft.video ||
        draft.music ||
        draft.voice ||
        draft.text.trim()
    );
  };

  const postStatus = () => {
    if (!canPost()) return;
    const media = draft.video || draft.image;
    const type = draft.video
      ? 'video'
      : draft.image
      ? 'image'
      : draft.music
      ? 'music'
      : draft.voice
      ? 'voice'
      : 'text';
    const isTrimmed =
      draft.video &&
      videoDuration > 0 &&
      (trimStart > 0 || trimEnd < videoDuration - 0.5);
    const newStatus = {
      id: `status-${Date.now()}`,
      user: 'You',
      avatar: 'https://i.pravatar.cc/150?img=1',
      type,
      thumbnail: media ? media.uri : null,
      content: media ? media.uri : '',
      mediaUri: media ? media.uri : '',
      mediaName: media ? media.name : '',
      music: draft.music || null,
      voice: draft.voice || null,
      text: draft.text.trim(),
      color: draft.color,
      trim: isTrimmed ? { start: trimStart, end: trimEnd } : null,
      time: 'Now',
      viewers: 0,
      createdAt: Date.now()
    };
    dispatch(addStatus(newStatus));
    const posted = newStatus;
    closeComposer();
    navigation.navigate('StatusDetail', { status: posted });
  };

  const myLatestStatus = myStatuses[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addStatusButton}
          onPress={handleAddStatus}
        >
          <View style={styles.addStatusIcon}>
            {myLatestStatus && myLatestStatus.thumbnail ? (
              myLatestStatus.type === 'video' ? (
                <View style={styles.addStatusVideoIcon}>
                  <Icon name="play-arrow" size={26} color="#00a884" />
                </View>
              ) : (
                <Image
                  source={{ uri: myLatestStatus.thumbnail }}
                  style={styles.addStatusAvatarImage}
                />
              )
            ) : myLatestStatus && myLatestStatus.type === 'text' ? (
              <View style={[styles.addStatusVideoIcon, { backgroundColor: myLatestStatus.color || '#075E54' }]}>
                <Text style={styles.addStatusTextThumb} numberOfLines={2}>
                  {myLatestStatus.text}
                </Text>
              </View>
            ) : myLatestStatus ? (
              <View style={styles.addStatusVideoIcon}>
                <Icon
                  name={myLatestStatus.type === 'voice' ? 'mic' : 'music-note'}
                  size={24}
                  color="#00a884"
                />
              </View>
            ) : (
              <Icon name="add" size={28} color="#00a884" />
            )}
          </View>
          <View style={styles.addStatusText}>
            <Text style={styles.addStatusLabel}>My Status</Text>
            <Text style={styles.addStatusSublabel}>Tap to add status update</Text>
          </View>
        </TouchableOpacity>

        {myStatuses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>My Updates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myStatuses.map((status) => (
                <TouchableOpacity
                  key={status.id}
                  style={styles.statusThumbnail}
                  onPress={() => navigation.navigate('StatusDetail', { status })}
                >
                  {status.type === 'video' ? (
                    <View style={styles.thumbnailVideo}>
                      <Icon name="play-arrow" size={30} color="#fff" />
                    </View>
                  ) : status.type === 'text' ? (
                    <View style={[styles.thumbnailVideo, { backgroundColor: status.color || '#075E54' }]}>
                      <Text style={styles.thumbnailText} numberOfLines={2}>
                        {status.text}
                      </Text>
                    </View>
                  ) : status.thumbnail ? (
                    <Image source={{ uri: status.thumbnail }} style={styles.thumbnailImage} />
                  ) : (
                    <View style={[styles.thumbnailVideo, styles.thumbnailAudio]}>
                      <Icon
                        name={status.type === 'voice' ? 'mic' : 'music-note'}
                        size={26}
                        color="#00a884"
                      />
                    </View>
                  )}
                  <View style={styles.statusRing} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.sectionTitle}>Recent Updates</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentUpdates.map((status) => (
            <TouchableOpacity
              key={status.id}
              style={styles.statusThumbnail}
              onPress={() => navigation.navigate('StatusDetail', { status })}
            >
              <Image source={{ uri: status.thumbnail }} style={styles.thumbnailImage} />
              <View style={styles.statusRing} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal
        visible={showAddStatus}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStatus(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Status</Text>
              <TouchableOpacity onPress={() => setShowAddStatus(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptions}>
              <TouchableOpacity style={styles.statusOption} onPress={pickImageFromDevice}>
                <Icon name="image" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption} onPress={pickVideoFromDevice}>
                <Icon name="videocam" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption} onPress={pickMusicFromDevice}>
                <Icon name="music-note" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Music</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statusOption}
                onPress={() => {
                  setShowAddStatus(false);
                  setShowVoiceRecorder(true);
                }}
              >
                <Icon name="mic" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption} onPress={pickTextStatus}>
                <Icon name="text-fields" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Text</Text>
              </TouchableOpacity>
            </View>

            {picking && (
              <View style={styles.pickingRow}>
                <ActivityIndicator color="#00a884" />
                <Text style={styles.pickingText}>Opening device picker...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showComposer}
        animationType="slide"
        transparent={true}
        onRequestClose={closeComposer}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Status</Text>
              <TouchableOpacity onPress={closeComposer}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.composerPreview}>
                {draft.image ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: draft.image.uri }} style={styles.composerImage} />
                    {draft.text ? (
                      <View style={styles.captionStrip}>
                        <Text style={[styles.captionText, { color: draft.color }]}>
                          {draft.text}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : draft.video ? (
                  <View style={styles.videoPreviewWrap}>
                    <Video
                      ref={videoRef}
                      source={{ uri: draft.video.uri }}
                      style={styles.composerVideo}
                      resizeMode="contain"
                      paused={!videoPreviewPlaying}
                      repeat={false}
                      progressUpdateInterval={250}
                      onLoad={handleVideoLoad}
                      onProgress={handleVideoProgress}
                    />
                    <TouchableOpacity
                      style={styles.videoPlayOverlay}
                      onPress={toggleVideoPreview}
                    >
                      <Icon
                        name={videoPreviewPlaying ? 'pause' : 'play-arrow'}
                        size={48}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                ) : draft.voice || draft.music ? (
                  <View style={styles.composerMusicPlaceholder}>
                    <Icon
                      name={draft.voice ? 'mic' : 'music-note'}
                      size={56}
                      color="#00a884"
                    />
                    <Text style={styles.composerMusicPlaceholderText}>
                      {draft.voice
                        ? draft.voice.name
                        : draft.music
                        ? draft.music.name
                        : 'Audio status'}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.composerTextPreview,
                      { backgroundColor: draft.color }
                    ]}
                  >
                    <Text style={styles.composerTextPreviewText}>
                      {draft.text || 'Type your status text...'}
                    </Text>
                  </View>
                )}
              </View>

              {draft.video && videoDuration > 0 && (
                <VideoTrimmer
                  duration={videoDuration}
                  start={trimStart}
                  end={trimEnd}
                  onChange={(start, end) => {
                    setTrimStart(start);
                    setTrimEnd(end);
                  }}
                />
              )}

              <TextInput
                style={styles.textInput}
                placeholder={
                  draft.image || draft.video
                    ? 'Add a caption...'
                    : 'Type your status text...'
                }
                placeholderTextColor="#666"
                value={draft.text}
                onChangeText={(text) => setDraft(prev => ({ ...prev, text }))}
                multiline
              />

              <View style={styles.paletteRow}>
                <Text style={styles.paletteLabel}>
                  {draft.image || draft.video ? 'Text color' : 'Background color'}
                </Text>
                <View style={styles.paletteSwatches}>
                  {STATUS_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.paletteSwatch,
                        { backgroundColor: color },
                        draft.color === color && styles.paletteSwatchSelected
                      ]}
                      onPress={() => setDraft(prev => ({ ...prev, color }))}
                    />
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.audioRow}
                onPress={() => setShowVoiceRecorder(true)}
              >
                <Icon name="mic" size={22} color="#00a884" />
                <View style={styles.audioRowText}>
                  <Text style={styles.audioRowLabel}>
                    {draft.voice ? 'Voice note' : 'Add voice note'}
                  </Text>
                  {draft.voice && (
                    <Text style={styles.audioRowName} numberOfLines={1}>
                      {draft.voice.name} · {formatDuration(draft.voice.duration)}
                    </Text>
                  )}
                </View>
                {draft.voice ? (
                  <TouchableOpacity
                    onPress={() => setDraft(prev => ({ ...prev, voice: null }))}
                  >
                    <Icon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <Icon name="chevron-right" size={20} color="#666" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioRow}
                onPress={pickMusicFromDevice}
                disabled={picking}
              >
                <Icon name="music-note" size={22} color="#00a884" />
                <View style={styles.audioRowText}>
                  <Text style={styles.audioRowLabel}>
                    {draft.music ? 'Status music' : 'Add music from device'}
                  </Text>
                  {draft.music && (
                    <Text style={styles.audioRowName} numberOfLines={1}>
                      {draft.music.name}
                    </Text>
                  )}
                </View>
                {draft.music ? (
                  <TouchableOpacity
                    onPress={() => setDraft(prev => ({ ...prev, music: null }))}
                  >
                    <Icon name="close" size={20} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <Icon name="chevron-right" size={20} color="#666" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.postButton, !canPost() && styles.postButtonDisabled]}
                onPress={postStatus}
                disabled={!canPost()}
              >
                <Text style={styles.postButtonText}>Post Status</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <VoiceRecorderSheet
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSave={handleVoiceSaved}
      />
    </View>
  );
};

const formatDuration = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  iconButton: {
    padding: 8
  },
  content: {
    flex: 1,
    padding: 16
  },
  addStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    marginBottom: 24
  },
  addStatusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0b141a',
    borderWidth: 2,
    borderColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden'
  },
  addStatusAvatarImage: {
    width: 56,
    height: 56
  },
  addStatusVideoIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2e35',
    padding: 4
  },
  addStatusTextThumb: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center'
  },
  addStatusText: {
    flex: 1
  },
  addStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  addStatusSublabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  statusThumbnail: {
    marginRight: 12
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  thumbnailVideo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1a2e35',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6
  },
  thumbnailAudio: {
    borderWidth: 1,
    borderColor: '#00a884'
  },
  thumbnailText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center'
  },
  statusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00a884'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1a2e35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  statusOption: {
    alignItems: 'center',
    padding: 16,
    width: '33%'
  },
  statusOptionText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8
  },
  pickingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  pickingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14
  },
  composerPreview: {
    height: 240,
    borderRadius: 12,
    backgroundColor: '#0b141a',
    marginBottom: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePreviewWrap: {
    width: '100%',
    height: '100%'
  },
  composerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  captionStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 10
  },
  captionText: {
    fontSize: 16,
    fontWeight: '600'
  },
  videoPreviewWrap: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  composerVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  videoPlayOverlay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  composerMusicPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 16
  },
  composerMusicPlaceholderText: {
    color: '#666',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center'
  },
  composerTextPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  composerTextPreviewText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center'
  },
  textInput: {
    backgroundColor: '#0b141a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 60,
    maxHeight: 120,
    marginBottom: 12
  },
  paletteRow: {
    marginBottom: 12
  },
  paletteLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  paletteSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  paletteSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  paletteSwatchSelected: {
    borderColor: '#fff'
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b141a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12
  },
  audioRowText: {
    flex: 1,
    marginLeft: 12
  },
  audioRowLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  audioRowName: {
    color: '#00a884',
    fontSize: 13,
    marginTop: 2
  },
  postButton: {
    backgroundColor: '#00a884',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8
  },
  postButtonDisabled: {
    backgroundColor: '#0f3d33'
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default StatusScreen;
