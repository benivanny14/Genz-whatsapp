import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Eye, Clock, Camera, Image, Type, Upload, RefreshCw, Film, Sparkles, Bookmark, Settings, Music, Download, Bell, Shield, TrendingUp, BarChart3, Palette, Share2, Accessibility, Mic, Archive, Users, Volume2, Zap, Heart, Calendar, MapPin, Cloud, QrCode, AtSign, Hash, Edit, Copy, Pin, Flag, Layout, FileText, Star, History, BellOff, Trash2, Forward, RotateCcw, Grid, Timer } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import StatusScrollFeed from '../components/StatusScrollFeed';
import StatusReel from '../components/StatusReel';
import StoryHighlights from '../components/StoryHighlights';
import CameraControls from '../components/CameraControls';
import TextEffectsPanel from '../components/TextEffectsPanel';
import SpecialStickersPanel from '../components/SpecialStickersPanel';
import DrawingPanel from '../components/DrawingPanel';
import FiltersPanel from '../components/FiltersPanel';
import BeautyRetouchPanel from '../components/BeautyRetouchPanel';
import BackgroundToolsPanel from '../components/BackgroundToolsPanel';
import VideoToolsPanel from '../components/VideoToolsPanel';
import ARFilterPanel from '../components/ARFilterPanel';
import AudioPanel from '../components/AudioPanel';
import SubtitlesPanel from '../components/SubtitlesPanel';
import CrossPlatformSharingPanel from '../components/CrossPlatformSharingPanel';
import AccessibilityPanel from '../components/AccessibilityPanel';
import BusinessShoppingPanel from '../components/BusinessShoppingPanel';
import StatusViewingPanel from '../components/StatusViewingPanel';
import StatusPrivacyPanel from '../components/StatusPrivacyPanel';
import StatusManagementPanel from '../components/StatusManagementPanel';
import ChatFeaturesPanel from '../components/ChatFeaturesPanel';
import CustomUIPanel from '../components/CustomUIPanel';
import ContactsPanel from '../components/ContactsPanel';
import AdvancedChatFeaturesPanel from '../components/AdvancedChatFeaturesPanel';
import VoiceFeaturesPanel from '../components/VoiceFeaturesPanel';
import AccessibilityAdvancedPanel from '../components/AccessibilityAdvancedPanel';
import DebugFeaturesPanel from '../components/DebugFeaturesPanel';
import StatusSecurityPanel from '../components/StatusSecurityPanel';
import PrivacyModsPanel from '../components/PrivacyModsPanel';
import MediaUploadEnhanced from '../components/MediaUploadEnhanced';
import AutoReplySettings from '../components/AutoReplySettings';
import MessageSchedule from '../components/MessageSchedule';
import StatusAnalyticsPanel from '../components/StatusAnalyticsPanel';
import ThemeStore from '../components/PaidFeatures/ThemeStore';
import CrossPlatformSharing from '../components/CrossPlatformSharing';
import StatusAccessibilityPanel from '../components/StatusAccessibilityPanel';
import VoiceChangerPanel from '../components/VoiceChangerPanel';
import TextToSpeechPanel from '../components/TextToSpeechPanel';
import StatusCollaborationPanel from '../components/StatusCollaborationPanel';
import StatusArchivePanel from '../components/StatusArchivePanel';
import StatusReminderPanel from '../components/StatusReminderPanel';
import StatusReactionPanel from '../components/StatusReactionPanel';
import StatusPollPanel from '../components/StatusPollPanel';
import StatusSchedulerPanel from '../components/StatusSchedulerPanel';
import LocationTaggingPanel from '../components/LocationTaggingPanel';
import StatusBackupPanel from '../components/StatusBackupPanel';
import StatusQRCodePanel from '../components/StatusQRCodePanel';
import StatusMentionsPanel from '../components/StatusMentionsPanel';
import StatusHashtagsPanel from '../components/StatusHashtagsPanel';
import StatusEditPanel from '../components/StatusEditPanel';
import StatusDuplicatePanel from '../components/StatusDuplicatePanel';
import StatusPinPanel from '../components/StatusPinPanel';
import StatusReportPanel from '../components/StatusReportPanel';
import StatusTemplatesPanel from '../components/StatusTemplatesPanel';
import StatusDraftsPanel from '../components/StatusDraftsPanel';
import StatusFavoritesPanel from '../components/StatusFavoritesPanel';
import StatusHistoryPanel from '../components/StatusHistoryPanel';
import StatusInsightsPanel from '../components/StatusInsightsPanel';
import StatusSharePanel from '../components/StatusSharePanel';
import StatusDownloadPanel from '../components/StatusDownloadPanel';
import StatusDeletePanel from '../components/StatusDeletePanel';
import StatusMutePanel from '../components/StatusMutePanel';
import StatusBlockPanel from '../components/StatusBlockPanel';
import StatusSavePanel from '../components/StatusSavePanel';
import StatusForwardPanel from '../components/StatusForwardPanel';
import TrailerStatusGenerator from '../components/TrailerStatusGenerator';
import MusicTrimmer from '../components/MusicTrimmer';

const Status = () => {
  const { statuses, fetchStatuses, createStatus, uploadStatusMedia, user, contacts } = useChat();
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [showScrollFeed, setShowScrollFeed] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showReel, setShowReel] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [feedStartId, setFeedStartId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewedStatuses, setViewedStatuses] = useState([]);
  const [autosaveStatuses, setAutosaveStatuses] = useState(false);
  const [statusNotificationSettings, setStatusNotificationSettings] = useState({});
  const [showStatusSecurity, setShowStatusSecurity] = useState(false);
  const [showTMPrivacy, setShowTMPrivacy] = useState(false);
  const [showMediaUploadEnhanced, setShowMediaUploadEnhanced] = useState(false);
  const [showAutoReply, setShowAutoReply] = useState(false);
  const [showMessageSchedule, setShowMessageSchedule] = useState(false);
  const [showStatusAnalytics, setShowStatusAnalytics] = useState(false);
  const [showThemeStore, setShowThemeStore] = useState(false);
  const [showCrossPlatform, setShowCrossPlatform] = useState(false);
  const [showStatusAccessibility, setShowStatusAccessibility] = useState(false);
  const [showVoiceChanger, setShowVoiceChanger] = useState(false);
  const [showTextToSpeech, setShowTextToSpeech] = useState(false);
  const [showStatusCollaboration, setShowStatusCollaboration] = useState(false);
  const [showStatusArchive, setShowStatusArchive] = useState(false);
  const [showStatusReminder, setShowStatusReminder] = useState(false);
  const [showStatusReaction, setShowStatusReaction] = useState(false);
  const [showStatusPoll, setShowStatusPoll] = useState(false);
  const [showStatusScheduler, setShowStatusScheduler] = useState(false);
  const [showLocationTagging, setShowLocationTagging] = useState(false);
  const [showStatusBackup, setShowStatusBackup] = useState(false);
  const [showStatusQRCode, setShowStatusQRCode] = useState(false);
  const [showStatusMentions, setShowStatusMentions] = useState(false);
  const [showStatusHashtags, setShowStatusHashtags] = useState(false);
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [showStatusDuplicate, setShowStatusDuplicate] = useState(false);
  const [showStatusPin, setShowStatusPin] = useState(false);
  const [showStatusReport, setShowStatusReport] = useState(false);
  const [showStatusTemplates, setShowStatusTemplates] = useState(false);
  const [showStatusDrafts, setShowStatusDrafts] = useState(false);
  const [showStatusFavorites, setShowStatusFavorites] = useState(false);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [showStatusInsights, setShowStatusInsights] = useState(false);
  const [showStatusShare, setShowStatusShare] = useState(false);
  const [showStatusDownload, setShowStatusDownload] = useState(false);
  const [showStatusDelete, setShowStatusDelete] = useState(false);
  const [showStatusMute, setShowStatusMute] = useState(false);
  const [showStatusBlock, setShowStatusBlock] = useState(false);
  const [showStatusSave, setShowStatusSave] = useState(false);
  const [showStatusForward, setShowStatusForward] = useState(false);
  const [selectedStatusForPanel, setSelectedStatusForPanel] = useState(null);
  const [uploadData, setUploadData] = useState(() => {
    let savedPrivacy = 'contacts';
    try {
      const saved = localStorage.getItem('genz_status_privacy_default');
      if (saved && ['everyone', 'contacts', 'contacts_except', 'only_share_with', 'only_me'].includes(saved)) {
        savedPrivacy = saved;
      }
    } catch (e) { /* ignore */ }
    return {
    type: 'text',
    caption: '',
    backgroundColor: '#1f2937',
    fontColor: '#ffffff',
    privacy: savedPrivacy,
    excludedViewers: [],
    includedViewers: [],
    file: null,
    // New status type fields
    linkUrl: '',
    quizQuestion: '',
    quizOptions: ['', ''],
    quizCorrectAnswer: 0,
    questionText: '',
    countdownDate: '',
    countdownTime: '',
    locationData: null,
    collageImages: [],
    timerSeconds: 5,
    musicUrl: '',
    musicFile: null,
    musicTrim: null,
    gifUrl: '',
    // Editor state
    textEffects: {},
    selectedSticker: null
    };
  });
  const [editImageUrl, setEditImageUrl] = useState(null);
  const [editVideoUrl, setEditVideoUrl] = useState(null);

  // ── Voice status recording state ──
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordPreviewUrl, setRecordPreviewUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordStreamRef = useRef(null);

  // ── Dual camera state ──
  const [dualCamActive, setDualCamActive] = useState(false);
  const [dualCamError, setDualCamError] = useState('');
  const [dualCamCaptured, setDualCamCaptured] = useState(false);
  const dualCamStreamsRef = useRef([]);
  const frontVideoRef = useRef(null);
  const backVideoRef = useRef(null);
  const dualCamCanvasRef = useRef(null);

  // Update edit URLs when uploadData.file changes
  useEffect(() => {
    if (uploadData.file) {
      const url = URL.createObjectURL(uploadData.file);
      if (uploadData.type === 'video') {
        setEditVideoUrl(url);
        setEditImageUrl(null);
      } else {
        setEditImageUrl(url);
        setEditVideoUrl(null);
      }
    } else {
      setEditImageUrl(null);
      setEditVideoUrl(null);
    }
  }, [uploadData.file, uploadData.type]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchStatuses();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchStatuses]);

  // Load viewed statuses from localStorage
  useEffect(() => {
    const savedViewed = localStorage.getItem('genz_viewed_statuses');
    if (savedViewed) {
      setViewedStatuses(JSON.parse(savedViewed));
    }
    const savedAutosave = localStorage.getItem('genz_autosave_statuses');
    if (savedAutosave) {
      setAutosaveStatuses(JSON.parse(savedAutosave));
    }
    const savedNotifications = localStorage.getItem('genz_status_notifications');
    if (savedNotifications) {
      setStatusNotificationSettings(JSON.parse(savedNotifications));
    }
  }, []);

  // Save viewed statuses to localStorage
  useEffect(() => {
    localStorage.setItem('genz_viewed_statuses', JSON.stringify(viewedStatuses));
  }, [viewedStatuses]);

  // Save autosave setting to localStorage
  useEffect(() => {
    localStorage.setItem('genz_autosave_statuses', JSON.stringify(autosaveStatuses));
  }, [autosaveStatuses]);

  // Save status notification settings to localStorage
  useEffect(() => {
    localStorage.setItem('genz_status_notifications', JSON.stringify(statusNotificationSettings));
  }, [statusNotificationSettings]);

  // Remember the last chosen status privacy as the default for new statuses
  useEffect(() => {
    try {
      localStorage.setItem('genz_status_privacy_default', uploadData.privacy);
    } catch (e) { /* ignore */ }
  }, [uploadData.privacy]);

  // Toggle status notifications for a specific user
  const toggleStatusNotification = (userId) => {
    setStatusNotificationSettings(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Check if status notifications are enabled for a user
  const isStatusNotificationEnabled = (userId) => {
    return statusNotificationSettings[userId] !== false; // Default is true
  };

  // Mark status as viewed
  const markStatusAsViewed = (statusId) => {
    if (!viewedStatuses.includes(statusId)) {
      setViewedStatuses(prev => [...prev, statusId]);

      // Autosave status if enabled
      if (autosaveStatuses) {
        const status = statuses.find(s => (s._id || s.id) === statusId);
        if (status && (status.mediaUrl || status.content)) {
          downloadStatus(status);
        }
      }
    }
  };

  // Download status media/content
  const downloadStatus = async (status) => {
    try {
      if (status.mediaUrl) {
        const link = document.createElement('a');
        link.href = status.mediaUrl;
        link.download = `status_${status._id || status.id}_${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (status.content) {
        const blob = new Blob([status.content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `status_text_${status._id || status.id}_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to download status:', error);
    }
  };

  // Get unviewed statuses count
  const getUnviewedCount = () => {
    return statuses.filter(status => 
      !viewedStatuses.includes(status._id || status.id) && 
      status.user?._id !== user?._id
    ).length;
  };

  // Handle music selection from device
  const handleMusicSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Create object URL for the music file
      const musicUrl = URL.createObjectURL(file);
      setUploadData(prev => ({
        ...prev,
        musicUrl,
        musicFile: file
      }));
    };
    input.click();
  };

  // Remove music from status
  const handleRemoveMusic = () => {
    if (uploadData.musicTrim?.url) URL.revokeObjectURL(uploadData.musicTrim.url);
    setUploadData(prev => ({
      ...prev,
      musicUrl: '',
      musicFile: null,
      musicTrim: null
    }));
  };

  const handleAddStatus = async () => {
    if (uploadData.type === 'text' && !uploadData.caption.trim()) {
      setError('Please enter a text for your status');
      return;
    }

    if (uploadData.type === 'link' && !uploadData.linkUrl.trim()) {
      setError('Please enter a link URL for your status');
      return;
    }

    if (uploadData.type === 'quiz' && !uploadData.quizQuestion.trim()) {
      setError('Please enter a quiz question');
      return;
    }

    if (uploadData.type === 'question' && !uploadData.questionText.trim()) {
      setError('Please enter a question');
      return;
    }

    if (uploadData.type === 'countdown' && !uploadData.countdownDate) {
      setError('Please select a countdown date');
      return;
    }

    if (uploadData.type === 'location' && !(uploadData.locationData && uploadData.locationData.address)) {
      setError('Please enter a location address');
      return;
    }

    const mediaFileTypes = ['image', 'video', 'audio', 'voice', 'boomerang', 'livePhoto', 'dualCamera'];
    if (mediaFileTypes.includes(uploadData.type) && !uploadData.file) {
      setError('Please select a file to upload');
      return;
    }

    if (uploadData.type === 'collage' && (!uploadData.collageImages || uploadData.collageImages.length === 0)) {
      setError('Please select at least one image for your collage');
      return;
    }

    try {
      setUploading(true);
      setError('');

      let mediaUrl = '';
      let mediaType = uploadData.type;

      if (mediaFileTypes.includes(uploadData.type) && uploadData.file) {
        const up = await uploadStatusMedia(uploadData.file);
        mediaUrl = up.fileUrl || '';
        mediaType = up.mediaType || uploadData.type;
      }

      if (uploadData.type === 'gif' && uploadData.gifUrl) {
        mediaUrl = uploadData.gifUrl;
      }

      if (uploadData.type === 'music' && uploadData.musicUrl) {
        if (uploadData.musicTrim?.blob) {
          const up = await uploadStatusMedia(uploadData.musicTrim.blob);
          mediaUrl = up.fileUrl || '';
        } else if (uploadData.musicFile) {
          const up = await uploadStatusMedia(uploadData.musicFile);
          mediaUrl = up.fileUrl || '';
        } else {
          mediaUrl = uploadData.musicUrl;
        }
      }

      let collageImages = uploadData.collageImages || [];
      if (uploadData.type === 'collage' && collageImages.length > 0) {
        const urls = [];
        for (const file of collageImages) {
          if (typeof file === 'string') { urls.push(file); continue; }
          const up = await uploadStatusMedia(file);
          if (up.fileUrl) urls.push(up.fileUrl);
        }
        collageImages = urls;
      }

      const privacy =
        uploadData.privacy === 'private' ? 'only_me' : uploadData.privacy;

      const text = uploadData.caption.trim();
      const payload = {
        type: uploadData.type,
        content: uploadData.type === 'text' ? text : (text || ' '),
        mediaUrl,
        mediaType,
        caption: uploadData.caption || '',
        backgroundColor: uploadData.backgroundColor,
        textColor: uploadData.fontColor,
        privacy,
        excludedViewers: privacy === 'contacts_except' ? uploadData.excludedViewers : [],
        includedViewers: privacy === 'only_share_with' ? uploadData.includedViewers : [],
        // New status type fields
        linkUrl: uploadData.linkUrl || '',
        quizQuestion: uploadData.quizQuestion || '',
        quizOptions: uploadData.quizOptions || [],
        quizCorrectAnswer: uploadData.quizCorrectAnswer || 0,
        questionText: uploadData.questionText || '',
        countdownDate: uploadData.countdownDate || '',
        countdownTime: uploadData.countdownTime || '',
        locationData: uploadData.locationData || null,
        collageImages,
        timerSeconds: uploadData.timerSeconds || 5,
        musicUrl: uploadData.musicUrl || '',
        gifUrl: uploadData.gifUrl || '',
        textEffects: uploadData.textEffects || null,
        selectedSticker: uploadData.selectedSticker || null,
        duration: uploadData.type === 'voice' ? recordingTime : 0,
        subtitles: uploadData.subtitles || null,
        audio: {
          backgroundMusic: uploadData.backgroundMusic || null,
          voiceOver: uploadData.voiceOver || null,
          soundEffects: uploadData.soundEffects || [],
          musicVolume: uploadData.musicVolume || 0.5,
          voiceVolume: uploadData.voiceVolume || 0.8,
          effectsVolume: uploadData.effectsVolume || 0.5
        }
      };

      const data = await createStatus(payload);
      if (!data.success) {
        throw new Error(data.message || 'Failed to create status');
      }

      setUploadData({
        type: 'text',
        caption: '',
        backgroundColor: '#1f2937',
        fontColor: '#ffffff',
        privacy: 'contacts',
        excludedViewers: [],
        file: null,
        linkUrl: '',
        quizQuestion: '',
        quizOptions: ['', ''],
        quizCorrectAnswer: 0,
        questionText: '',
        countdownDate: '',
        countdownTime: '',
        locationData: null,
        collageImages: [],
        timerSeconds: 5,
        musicUrl: '',
        musicFile: null,
        musicTrim: null,
        gifUrl: '',
        textEffects: null,
        selectedSticker: null,
        subtitles: null,
        backgroundMusic: null,
        voiceOver: null,
        soundEffects: [],
        musicVolume: 0.5,
        voiceVolume: 0.8,
        effectsVolume: 0.5
      });
      if (recordPreviewUrl) URL.revokeObjectURL(recordPreviewUrl);
      setRecordPreviewUrl('');
      setRecordingTime(0);
      setIsRecording(false);
      setIsPaused(false);
      setShowAddStatus(false);
      setSuccess('Status uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchStatuses();
    } catch (err) {
      console.error('Error uploading status:', err);
      setError(err.message || 'Failed to upload status');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadData((prev) => {
      let type = prev.type;
      // Keep explicit special types (boomerang, livePhoto, dualCamera, timer,
      // gif, music) — only infer image/video/audio for the plain media types.
      if (!['boomerang', 'livePhoto', 'dualCamera', 'timer', 'gif', 'music'].includes(type)) {
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
      }
      return { ...prev, file, type };
    });
  };

  // ── Voice status recording ──
  const startVoiceRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, mimeType === 'audio/webm' ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `voice-status-${Date.now()}.${mimeType.includes('webm') ? 'webm' : 'm4a'}`, { type: mimeType });
        setUploadData((prev) => ({ ...prev, file, type: 'voice' }));
        setRecordPreviewUrl(URL.createObjectURL(blob));
        if (recordStreamRef.current) {
          recordStreamRef.current.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
        }
        setIsRecording(false);
        setIsPaused(false);
      };

      mediaRecorder.onerror = () => {
        setError('Recording failed. Please try again.');
      };

      mediaRecorder.start();
      setRecordingTime(0);
      setIsRecording(true);
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      setError('Microphone not available. Please allow microphone access or check your device.');
    }
  };

  const stopVoiceRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePauseVoiceRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      setIsPaused(true);
    } else if (mr.state === 'paused') {
      mr.resume();
      setIsPaused(false);
    }
  };

  const clearVoiceRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((t) => t.stop());
      recordStreamRef.current = null;
    }
    if (recordPreviewUrl) URL.revokeObjectURL(recordPreviewUrl);
    setRecordPreviewUrl('');
    setUploadData((prev) => ({ ...prev, file: null, type: 'voice' }));
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  // ── Dual camera (front + back at once, picture-in-picture like WhatsApp) ──
  const openDualCamera = async () => {
    setDualCamError('');
    setDualCamCaptured(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDualCamError('Camera not supported in this browser');
      return;
    }
    try {
      const [frontStream, backStream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 320 } },
          audio: false
        }).catch(() => null),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        }).catch(() => null)
      ]);
      if (!frontStream && !backStream) {
        setDualCamError('Could not access cameras. Check permissions and try again.');
        return;
      }
      dualCamStreamsRef.current = [frontStream, backStream].filter(Boolean);
      setDualCamActive(true);
      // Let the video elements attach after render
      setTimeout(() => {
        if (frontStream && frontVideoRef.current) {
          frontVideoRef.current.srcObject = frontStream;
          frontVideoRef.current.play().catch(() => {});
        }
        if (backStream && backVideoRef.current) {
          backVideoRef.current.srcObject = backStream;
          backVideoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      console.error('Dual camera error:', err);
      setDualCamError('Could not open cameras: ' + (err.message || 'permission denied'));
    }
  };

  const stopDualCamera = () => {
    dualCamStreamsRef.current.forEach((s) => s && s.getTracks().forEach((t) => t.stop()));
    dualCamStreamsRef.current = [];
    setDualCamActive(false);
  };

  const captureDualCamera = () => {
    const canvas = dualCamCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const back = backVideoRef.current;
    const front = frontVideoRef.current;
    const bw = back && back.videoWidth ? back.videoWidth : 640;
    const bh = back && back.videoHeight ? back.videoHeight : 640;
    const fw = front && front.videoWidth ? front.videoWidth : 320;
    const fh = front && front.videoHeight ? front.videoHeight : 320;
    const size = Math.max(bw, bh);
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    // Back camera fills the canvas
    if (back && back.videoWidth) {
      const s = Math.min(size / bw, size / bh);
      const dw = bw * s, dh = bh * s;
      ctx.drawImage(back, (size - dw) / 2, (size - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#6b7280';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Back camera unavailable', size / 2, size / 2);
    }
    // Front camera as a small rounded overlay (picture-in-picture) in the corner
    if (front && front.videoWidth) {
      const overlay = Math.round(size * 0.32);
      const margin = Math.round(size * 0.03);
      const x = size - overlay - margin;
      const y = margin;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + overlay / 2, y + overlay / 2, overlay / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const s = Math.max(overlay / fw, overlay / fh);
      const dw = fw * s, dh = fh * s;
      ctx.drawImage(front, x - (dw - overlay) / 2, y - (dh - overlay) / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + overlay / 2, y + overlay / 2, overlay / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'dual-camera-status.png', { type: 'image/png' });
      setUploadData((prev) => ({ ...prev, file, type: 'dualCamera', caption: prev.caption || 'Dual camera status' }));
      setDualCamCaptured(true);
      stopDualCamera();
    }, 'image/png');
  };

  const formatRecTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordStreamRef.current) {
        recordStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Editor panel handlers
  const openEditorPanel = (panel) => {
    setActivePanel(panel);
    setShowSettings(true);
  };

  const handleEditorSaveImage = (blob) => {
    if (!blob) return;
    const file = new File([blob], `edited-status-${Date.now()}.png`, { type: blob.type || 'image/png' });
    setUploadData((prev) => ({ ...prev, file, type: prev.type === 'video' ? 'video' : 'image' }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleCameraCapture = (blob) => {
    if (!blob) return;
    const file = new File([blob], `camera-status-${Date.now()}.png`, { type: 'image/png' });
    setUploadData((prev) => ({ ...prev, file, type: 'image' }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleTextEffectsChange = (effects) => {
    setUploadData((prev) => ({ ...prev, textEffects: { ...(prev.textEffects || {}), ...effects } }));
  };

  const handleStickerSelect = (sticker) => {
    setUploadData((prev) => ({ ...prev, selectedSticker: sticker }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleEditorSaveVideo = (video) => {
    if (!video) return;
    setUploadData((prev) => ({ ...prev, file: video }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleAudioSave = (audioData) => {
    if (!audioData) return;
    setUploadData((prev) => ({ ...prev, ...audioData }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleSubtitlesSave = (subtitlesData) => {
    if (!subtitlesData) return;
    setUploadData((prev) => ({ ...prev, subtitles: subtitlesData }));
    setActivePanel(null);
    setShowSettings(false);
  };

  const handleStatusManageSave = async () => {
    setSelectedStatusForPanel(null);
    await fetchStatuses();
  };

  const openStatusPanel = (setter) => {
    const newest = [...statuses].sort((a, b) =>
      new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0)
    )[0];
    setSelectedStatusForPanel(newest || null);
    setter(true);
  };

  const handlePanelSave = async (panelKey, data) => {
    try {
      await authFetch(`${resolveApiBase()}/status-features/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [panelKey]: data } })
      });
      // Auto-Reply here is saved to the canonical source (genzMods.autoReply)
      // which the message pipeline reads — not just status-features (decorative).
      if (panelKey === 'advancedChat' && data && data.autoReplyEnabled !== undefined) {
        await authFetch(`${resolveApiBase()}/genz-mods/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoReply: {
              enabled: !!data.autoReplyEnabled,
              message: data.autoReplyMessage || ''
            }
          })
        });
      }
    } catch (error) {
      console.error(`Failed to save ${panelKey} settings:`, error);
    }
    setActivePanel(null);
    setShowSettings(false);
  };

  const statusTime = (s) => {
    const t = s.timestamp || s.createdAt;
    if (!t) return '';
    try {
      return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Flatten collaborative stories (owner + contributors) into one feed so the
  // viewer shows all shared-story items in sequence.
  const statusFeed = useMemo(() => {
    const feed = [];
    for (const s of statuses || []) {
      feed.push(s);
      if (Array.isArray(s._contributions) && s._contributions.length > 0) {
        feed.push(...s._contributions);
      }
    }
    return feed;
  }, [statuses]);

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden font-sans" style={{ background: 'radial-gradient(1200px 700px at 18% 8%, rgba(255,45,120,0.20), transparent 55%), radial-gradient(1100px 700px at 88% 95%, rgba(124,92,255,0.20), transparent 55%), radial-gradient(900px 600px at 70% 20%, rgba(0,217,166,0.10), transparent 50%), #0c0a1e' }}>
      <div className="w-full h-full md:w-[98%] md:h-[96%] bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col border border-white/10 rounded-2xl">
        <div className="genz-header text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="genz-tag">GENZ</span>
            <button
              type="button"
              onClick={() => setShowReel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffd447] text-[#14122b] rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg genz-sticker"
              title="Status Reel Mode" aria-label="Status Reel Mode"
            >
              <Film size={16} /> Reel
            </button>
            <button
              type="button"
              onClick={() => setShowTrailer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c5cff] text-white rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg genz-sticker"
              title="Movie Trailer Status" aria-label="Movie Trailer Status"
            >
              <Sparkles size={16} /> Trailer
            </button>
            <button
              type="button"
              onClick={() => setShowHighlights(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg"
              title="Story Highlights" aria-label="Story Highlights"
            >
              <Bookmark size={16} /> Highlights
            </button>
            <button
              type="button"
              onClick={() => setShowThemeStore(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-lg"
              title="Theme Store" aria-label="Theme Store"
            >
              <Palette size={16} /> Themes
            </button>
            <button
              type="button"
              onClick={() => setShowTMPrivacy(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Privacy" aria-label="Privacy"
            >
              <Shield size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowMediaUploadEnhanced(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Enhanced Upload" aria-label="Enhanced Upload"
            >
              <Upload size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowAutoReply(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Auto Reply" aria-label="Auto Reply"
            >
              <Mic size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowVoiceChanger(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Voice Changer" aria-label="Voice Changer"
            >
              <Zap size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowTextToSpeech(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Text to Speech" aria-label="Text to Speech"
            >
              <Volume2 size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusArchive(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Archive" aria-label="Archive"
            >
              <Archive size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusScheduler)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Schedule" aria-label="Schedule"
            >
              <Calendar size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowLocationTagging)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Location" aria-label="Location"
            >
              <MapPin size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusBackup(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Backup" aria-label="Backup"
            >
              <Cloud size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusQRCode)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="QR Code" aria-label="QR Code"
            >
              <QrCode size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusPoll)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Poll" aria-label="Poll"
            >
              <BarChart3 size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusMentions)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Mentions" aria-label="Mentions"
            >
              <AtSign size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusHashtags)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Hashtags" aria-label="Hashtags"
            >
              <Hash size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusTemplates(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Templates" aria-label="Templates"
            >
              <Layout size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusDrafts(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Drafts" aria-label="Drafts"
            >
              <FileText size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusFavorites(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Favorites" aria-label="Favorites"
            >
              <Star size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowStatusHistory(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="History" aria-label="History"
            >
              <History size={20} />
            </button>
            <button
              type="button"
              onClick={() => openStatusPanel(setShowStatusInsights)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Insights" aria-label="Insights"
            >
              <BarChart3 size={20} />
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await fetchStatuses();
                setLoading(false);
              }}
              disabled={loading}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
             aria-label="Refresh">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
             aria-label="Settings">
              <Settings size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAddStatus(true)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
           aria-label="Add">
            <Plus size={24} />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowAddStatus(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowAddStatus(true)}
          className="p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg">
              <Plus size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">My Status</p>
              <p className="text-sm text-blue-300">Tap to add status update</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p>Loading statuses...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm text-gray-400">Recent updates</h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Download size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-400">Autosave</span>
                    <input
                      type="checkbox"
                      checked={autosaveStatuses}
                      onChange={(e) => setAutosaveStatuses(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                  {statuses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeedStartId(null);
                        setShowScrollFeed(true);
                      }}
                      className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
                    >
                      View All
                    </button>
                  )}
                </div>
              </div>
              {statuses.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No recent status updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(statuses || []).map((status) => {
                    const sid = status._id || status.id;
                    return (
                      <div
                        key={sid}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-4 p-3 bg-white/5 backdrop-blur-md rounded-lg shadow hover:bg-white/10 transition-shadow cursor-pointer border border-white/10"
                        onClick={() => {
                          setFeedStartId(sid);
                          setShowScrollFeed(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setFeedStartId(sid);
                            setShowScrollFeed(true);
                          }
                        }}
                      >
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border border-white/20 ${
                            !viewedStatuses.includes(status._id || status.id) && status.user?._id !== user?._id
                              ? 'bg-green-500 ring-4 ring-green-500/30'
                              : 'bg-primary-600'
                          }`}>
                            {status.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          {!viewedStatuses.includes(status._id || status.id) && status.user?._id !== user?._id && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0b141a]"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${
                            !viewedStatuses.includes(status._id || status.id) && status.user?._id !== user?._id
                              ? 'text-white'
                              : 'text-gray-300'
                          }`}>
                            {status.username || 'Unknown'}
                            {status._contributions?.length > 0 && (
                              <span className="text-pink-400 text-xs font-bold ml-1">
                                & {status._contributions.length} collaborator{status._contributions.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </p>
                          <p className={`text-sm truncate ${
                            !viewedStatuses.includes(status._id || status.id) && status.user?._id !== user?._id
                              ? 'text-white'
                              : 'text-gray-400'
                          }`}>{status.content || status.caption || status.type}</p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-sm flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStatusNotification(status.user?._id || status.user?.id);
                            }}
                            className={`p-1.5 rounded-full transition-colors ${
                              isStatusNotificationEnabled(status.user?._id || status.user?.id)
                                ? 'text-blue-400 hover:bg-blue-400/20'
                                : 'text-gray-500 hover:bg-gray-500/20'
                            }`}
                            title={isStatusNotificationEnabled(status.user?._id || status.user?.id) ? 'Notifications On' : 'Notifications Off'}
                          >
                            <Bell size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusAnalytics(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Analytics"
                          >
                            <BarChart3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusSecurity(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Security"
                          >
                            <Shield size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusAccessibility(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Accessibility"
                          >
                            <Accessibility size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowCrossPlatform(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Share"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusCollaboration(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Collaborate"
                          >
                            <Users size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusReminder(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Set Reminder"
                          >
                            <Bell size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusReaction(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="React"
                          >
                            <Heart size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusForward(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Forward"
                          >
                            <Forward size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusSave(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Save"
                          >
                            <Bookmark size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusDownload(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusShare(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Share"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusEdit(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusDuplicate(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusPin(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-[#00a884] transition-colors"
                            title="Pin"
                          >
                            <Pin size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusReport(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-red-400 transition-colors"
                            title="Report"
                          >
                            <Flag size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusMute(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-yellow-400 transition-colors"
                            title="Mute"
                          >
                            <BellOff size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusBlock(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-red-400 transition-colors"
                            title="Block"
                          >
                            <Shield size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatusForPanel(status);
                              setShowStatusDelete(true);
                            }}
                            className="p-1.5 rounded-full hover:bg-white/20 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                          <Clock size={14} />
                          <span>{statusTime(status)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {showAddStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-96 max-w-[90%] p-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Status</h3>
                <button type="button" onClick={() => setShowAddStatus(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Close">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
                    { value: 'image', icon: <Image className="w-4 h-4" />, label: 'Image' },
                    { value: 'video', icon: <Camera className="w-4 h-4" />, label: 'Video' },
                    { value: 'voice', icon: <Mic className="w-4 h-4" />, label: 'Voice' },
                    { value: 'audio', icon: <Type className="w-4 h-4" />, label: 'Audio' },
                    { value: 'gif', icon: <Sparkles className="w-4 h-4" />, label: 'GIF' },
                    { value: 'link', icon: <Upload className="w-4 h-4" />, label: 'Link' },
                    { value: 'music', icon: <Type className="w-4 h-4" />, label: 'Music' },
                    { value: 'quiz', icon: <Type className="w-4 h-4" />, label: 'Quiz' },
                    { value: 'question', icon: <Type className="w-4 h-4" />, label: 'Question' },
                    { value: 'countdown', icon: <Clock className="w-4 h-4" />, label: 'Countdown' },
                    { value: 'location', icon: <Upload className="w-4 h-4" />, label: 'Location' },
                    { value: 'collage', icon: <Image className="w-4 h-4" />, label: 'Collage' },
                    { value: 'boomerang', icon: <RotateCcw className="w-4 h-4" />, label: 'Boomerang' },
                    { value: 'livePhoto', icon: <Camera className="w-4 h-4" />, label: 'Live Photo' },
                    { value: 'dualCamera', icon: <Grid className="w-4 h-4" />, label: 'Dual Camera' },
                    { value: 'timer', icon: <Timer className="w-4 h-4" />, label: 'Timer' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        if (uploadData.type === 'voice' && type.value !== 'voice') {
                          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                            mediaRecorderRef.current.stop();
                          }
                          if (recordStreamRef.current) {
                            recordStreamRef.current.getTracks().forEach((t) => t.stop());
                            recordStreamRef.current = null;
                          }
                          if (recordPreviewUrl) URL.revokeObjectURL(recordPreviewUrl);
                          setRecordPreviewUrl('');
                          setIsRecording(false);
                          setIsPaused(false);
                          setRecordingTime(0);
                          setUploadData((prev) => ({ ...prev, type: type.value, file: null }));
                        } else {
                          setUploadData((prev) => ({ ...prev, type: type.value }));
                        }
                      }}
                      className={`p-2 rounded-lg border transition-colors ${uploadData.type === type.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        {type.icon}
                        <span className="text-xs">{type.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {uploadData.type === 'dualCamera' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dual Camera — Front + Back at once
                  </label>
                  {!dualCamActive && !uploadData.file && (
                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-4 flex flex-col items-center space-y-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Capture with both cameras at the same time. The front camera appears in a small circle over the main camera view.
                      </p>
                      <button
                        type="button"
                        onClick={openDualCamera}
                        className="px-4 py-2 bg-[#00a884] text-white rounded-full text-sm font-medium hover:bg-[#008f6f] transition-colors flex items-center gap-2"
                      >
                        <Camera size={16} /> Open Dual Camera
                      </button>
                    </div>
                  )}
                  {dualCamError && (
                    <p className="text-xs text-red-500 mt-1">{dualCamError}</p>
                  )}
                  {dualCamActive && (
                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-3 space-y-3">
                      <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: 240 }}>
                        <video
                          ref={backVideoRef}
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <video
                          ref={frontVideoRef}
                          muted
                          playsInline
                          className="absolute top-2 right-2 w-24 h-24 rounded-full object-cover border-2 border-white/80 shadow-lg"
                        />
                      </div>
                      <div className="flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={captureDualCamera}
                          className="px-5 py-2 bg-[#00a884] text-white rounded-full text-sm font-medium hover:bg-[#008f6f] transition-colors"
                        >
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopDualCamera}
                          className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {uploadData.file && !dualCamActive && (
                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-3 flex items-center justify-between">
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {dualCamCaptured ? '✓ Dual camera photo captured — ready to post' : 'Photo attached'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setUploadData((prev) => ({ ...prev, file: null }))}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <canvas ref={dualCamCanvasRef} className="hidden" />
                </div>
              )}

              {['image', 'video', 'audio', 'boomerang', 'livePhoto', 'dualCamera'].includes(uploadData.type) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload File
                  </label>
                  <input
                    type="file"
                    accept={
                      uploadData.type === 'image' || uploadData.type === 'livePhoto' || uploadData.type === 'dualCamera'
                        ? 'image/*'
                        : uploadData.type === 'video' || uploadData.type === 'boomerang'
                          ? 'video/*'
                          : 'audio/*'
                    }
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {uploadData.type === 'voice' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Record Voice Status
                  </label>

                  {!uploadData.file && (
                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-4 flex flex-col items-center space-y-4">
                      {isRecording ? (
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className={`text-sm font-mono ${isPaused ? 'text-gray-500' : 'text-red-500'}`}>
                              {formatRecTime(recordingTime)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={togglePauseVoiceRecording}
                              className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm hover:bg-yellow-600"
                            >
                              {isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button
                              type="button"
                              onClick={stopVoiceRecording}
                              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
                            >
                              Stop & Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 text-gray-400" />
                          <button
                            type="button"
                            onClick={startVoiceRecording}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                          >
                            Start Recording
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {uploadData.file && recordPreviewUrl && (
                    <div className="rounded-lg border border-gray-300 dark:border-gray-600 p-4 flex flex-col items-center space-y-3">
                      <audio src={recordPreviewUrl} controls className="w-full" />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRecTime(recordingTime)} recorded
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={clearVoiceRecording}
                          className="px-4 py-2 rounded-lg bg-gray-500 text-white text-sm hover:bg-gray-600"
                        >
                          Re-record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(uploadData.type === 'text' || uploadData.file) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Caption
                  </label>
                  <textarea
                    value={uploadData.caption}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, caption: e.target.value }))}
                    placeholder={uploadData.type === 'text' ? 'Type your status message...' : 'Add a caption...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
              )}

              {uploadData.type === 'text' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={uploadData.backgroundColor}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Color
                    </label>
                    <input
                      type="color"
                      value={uploadData.fontColor}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, fontColor: e.target.value }))}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {uploadData.type === 'link' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={uploadData.linkUrl}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, linkUrl: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {uploadData.type === 'quiz' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quiz Question
                    </label>
                    <input
                      type="text"
                      value={uploadData.quizQuestion}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, quizQuestion: e.target.value }))}
                      placeholder="Enter your question"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quiz Options (comma separated)
                    </label>
                    <input
                      type="text"
                      value={uploadData.quizOptions.join(', ')}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, quizOptions: e.target.value.split(',').map(s => s.trim()) }))}
                      placeholder="Option 1, Option 2, Option 3, Option 4"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Correct Answer Index (0-3)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="3"
                      value={uploadData.quizCorrectAnswer}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, quizCorrectAnswer: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </>
              )}

              {uploadData.type === 'question' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Question Text
                  </label>
                  <textarea
                    value={uploadData.questionText}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, questionText: e.target.value }))}
                    placeholder="Ask your followers a question..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
              )}

              {uploadData.type === 'countdown' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={uploadData.countdownDate}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, countdownDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={uploadData.countdownTime}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, countdownTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {uploadData.type === 'location' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={uploadData.locationData?.address || ''}
                      onChange={(e) => setUploadData((prev) => ({ ...prev, locationData: { ...prev.locationData, address: e.target.value } }))}
                      placeholder="Enter location address"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!navigator.geolocation) {
                          setError('Geolocation is not supported by this browser');
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setUploadData((prev) => ({
                              ...prev,
                              locationData: {
                                ...prev.locationData,
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude
                              }
                            }));
                            setError('');
                          },
                          (err) => setError(`Could not get location: ${err.message}`),
                          { enableHighAccuracy: true, timeout: 10000 }
                        );
                      }}
                      className="px-4 py-2 shrink-0 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Use My Location
                    </button>
                  </div>
                  {uploadData.locationData?.lat != null && uploadData.locationData?.lng != null && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Coordinates: {Number(uploadData.locationData.lat).toFixed(6)}, {Number(uploadData.locationData.lng).toFixed(6)}
                    </p>
                  )}
                </div>
              )}

              {uploadData.type === 'collage' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Images (up to 4)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files).slice(0, 4);
                      setUploadData((prev) => ({ ...prev, collageImages: files }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {uploadData.type === 'music' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Music URL
                  </label>
                  <input
                    type="url"
                    value={uploadData.musicUrl}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, musicUrl: e.target.value }))}
                    placeholder="https://example.com/music.mp3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {uploadData.type === 'gif' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GIF URL
                  </label>
                  <input
                    type="url"
                    value={uploadData.gifUrl}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, gifUrl: e.target.value }))}
                    placeholder="https://giphy.com/..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Privacy
                </label>
                {/* WhatsApp-style privacy radio options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status-privacy"
                      checked={uploadData.privacy === 'everyone'}
                      onChange={() => setUploadData((prev) => ({ ...prev, privacy: 'everyone' }))}
                      className="accent-[#00a884] w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100">Everyone</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Anyone can view your status</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status-privacy"
                      checked={uploadData.privacy === 'contacts'}
                      onChange={() => setUploadData((prev) => ({ ...prev, privacy: 'contacts' }))}
                      className="accent-[#00a884] w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100">My Contacts</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Only your contacts can view your status</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status-privacy"
                      checked={uploadData.privacy === 'only_share_with'}
                      onChange={() => setUploadData((prev) => ({ ...prev, privacy: 'only_share_with' }))}
                      className="accent-[#00a884] w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100">Only Share With...</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(uploadData.includedViewers || []).length > 0
                          ? `${(uploadData.includedViewers || []).length} contact${(uploadData.includedViewers || []).length > 1 ? 's' : ''} selected`
                          : 'Choose specific people to share your status with'}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status-privacy"
                      checked={uploadData.privacy === 'contacts_except'}
                      onChange={() => setUploadData((prev) => ({ ...prev, privacy: 'contacts_except' }))}
                      className="accent-[#00a884] w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100">My Contacts Except...</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(uploadData.excludedViewers || []).length > 0
                          ? `${(uploadData.excludedViewers || []).length} contact${(uploadData.excludedViewers || []).length > 1 ? 's' : ''} hidden`
                          : 'Hide your status from specific contacts'}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="status-privacy"
                      checked={uploadData.privacy === 'private' || uploadData.privacy === 'only_me'}
                      onChange={() => setUploadData((prev) => ({ ...prev, privacy: 'only_me' }))}
                      className="accent-[#00a884] w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-100">Only Me</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Only you can view your status</p>
                    </div>
                  </label>
                </div>

              {(uploadData.type === 'image' || uploadData.type === 'video') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Edit Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditorPanel('filters')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('textEffects')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Text Effects
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('drawing')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Drawing
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('beauty')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Beauty
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('background')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Background
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('video')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Video Tools
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('ar')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      AR Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('audio')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditorPanel('subtitles')}
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-xs"
                    >
                      Subtitles
                    </button>
                  </div>
                </div>
              )}

              {/* Music Selection */}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Music</span>
                  </div>
                  {!uploadData.musicUrl ? (
                    <button
                      type="button"
                      onClick={handleMusicSelect}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Select Music
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveMusic}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Remove Music
                    </button>
                  )}
                </div>
                {uploadData.musicUrl && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="truncate">🎵 {uploadData.musicFile?.name || 'Music selected'}</span>
                  </div>
                )}
                {uploadData.musicUrl && uploadData.musicFile && (
                  <MusicTrimmer
                    file={uploadData.musicFile}
                    onTrim={(trim) => setUploadData((prev) => ({ ...prev, musicTrim: trim }))}
                  />
                )}
              </div>

                {/* FEATURE ADD: WhatsApp-style "hide my status from..." picker.
                    Anyone checked here won't be able to see this status even
                    though they're a contact. */}
                {/* FEATURE ADD: "Only Share With..." picker — chosen people are the ONLY ones who see this status */}
                {uploadData.privacy === 'only_share_with' && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
                    {(contacts || []).length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-2 text-center">No contacts yet</p>
                    )}
                    {(contacts || []).map((c) => {
                      const cid = String(c.user?._id || c.user || c._id || c.id);
                      const checked = uploadData.includedViewers.includes(cid);
                      return (
                        <label key={cid} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setUploadData((prev) => ({
                              ...prev,
                              includedViewers: checked
                                ? prev.includedViewers.filter((id) => id !== cid)
                                : [...prev.includedViewers, cid]
                            }))}
                          />
                          {c.user?.username || c.username || c.name || 'Contact'}
                        </label>
                      );
                    })}
                  </div>
                )}
                {/* FEATURE: "My Contacts Except..." picker — checked people are hidden from this status */}
                {uploadData.privacy === 'contacts_except' && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
                    {(contacts || []).length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-2 text-center">No contacts yet</p>
                    )}
                    {(contacts || []).map((c) => {
                      const cid = String(c.user?._id || c.user || c._id || c.id);
                      const checked = uploadData.excludedViewers.includes(cid);
                      return (
                        <label key={cid} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 py-1 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setUploadData((prev) => ({
                              ...prev,
                              excludedViewers: checked
                                ? prev.excludedViewers.filter((id) => id !== cid)
                                : [...prev.excludedViewers, cid]
                            }))}
                          />
                          {c.user?.username || c.username || c.name || 'Contact'}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddStatus(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddStatus}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Post Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showScrollFeed && (
          <StatusScrollFeed
            statuses={statusFeed}
            onClose={() => {
              setShowScrollFeed(false);
              setFeedStartId(null);
            }}
            currentUserId={user?._id || user?.id || 'local-user'}
            initialStatusId={feedStartId}
          />
        )}

        {showTrailer && (
          <TrailerStatusGenerator
            statuses={statuses}
            user={user}
            onClose={() => setShowTrailer(false)}
          />
        )}

        {/* Status Reel — Instagram/TikTok Style */}
        {showReel && (
          <StatusReel
            initialStatuses={statuses}
            onClose={() => setShowReel(false)}
          />
        )}

        {/* Story Highlights */}
        {showHighlights && (
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold flex items-center gap-2">
                <Bookmark size={18} className="text-yellow-400" /> Story Highlights
              </span>
              <button onClick={() => setShowHighlights(false)} className="text-white/60 hover:text-white p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StoryHighlights statuses={statuses} />
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-bold flex items-center gap-2">
                <Settings size={18} /> Status Settings
              </span>
              <button onClick={() => setShowSettings(false)} className="text-white/60 hover:text-white p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!activePanel ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button onClick={() => setActivePanel('camera')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Camera Controls</button>
                  <button onClick={() => setActivePanel('textEffects')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Text Effects</button>
                  <button onClick={() => setActivePanel('stickers')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Special Stickers</button>
                  <button onClick={() => setActivePanel('drawing')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Drawing Tools</button>
                  <button onClick={() => setActivePanel('filters')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Filters</button>
                  <button onClick={() => setActivePanel('beauty')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Beauty Retouch</button>
                  <button onClick={() => setActivePanel('background')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Background Tools</button>
                  <button onClick={() => setActivePanel('video')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Video Tools</button>
                  <button onClick={() => setActivePanel('ar')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">AR Filters</button>
                  <button onClick={() => setActivePanel('audio')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Audio Panel</button>
                  <button onClick={() => setActivePanel('subtitles')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Subtitles</button>
                  <button onClick={() => setActivePanel('sharing')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Cross-Platform Sharing</button>
                  <button onClick={() => setActivePanel('accessibility')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Accessibility</button>
                  <button onClick={() => setActivePanel('business')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Business/Shopping</button>
                  <button onClick={() => setActivePanel('viewing')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Status Viewing</button>
                  <button onClick={() => setActivePanel('privacy')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Status Privacy</button>
                  <button onClick={() => setActivePanel('management')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Status Management</button>
                  <button onClick={() => setActivePanel('chat')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Chat Features</button>
                  <button onClick={() => setActivePanel('customui')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Custom UI</button>
                  <button onClick={() => setActivePanel('contacts')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Contacts</button>
                  <button onClick={() => setActivePanel('advancedChat')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Advanced Chat</button>
                  <button onClick={() => setActivePanel('voice')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Voice Features</button>
                  <button onClick={() => setActivePanel('accessibilityAdv')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Accessibility Advanced</button>
                  <button onClick={() => setActivePanel('debug')} className="p-4 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">Debug Features</button>
                </div>
              ) : (
                <div>
                  <button onClick={() => setActivePanel(null)} className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">← Back to Settings</button>
{activePanel === 'camera' && <CameraControls onClose={() => setActivePanel(null)} onCapture={handleCameraCapture} />}
                    {activePanel === 'textEffects' && <TextEffectsPanel onClose={() => setActivePanel(null)} onEffectChange={handleTextEffectsChange} currentEffects={uploadData.textEffects} />}
                    {activePanel === 'stickers' && <SpecialStickersPanel onClose={() => setActivePanel(null)} onStickerSelect={handleStickerSelect} />}
                    {activePanel === 'drawing' && <DrawingPanel onClose={() => setActivePanel(null)} image={editImageUrl} onSave={handleEditorSaveImage} />}
                    {activePanel === 'filters' && <FiltersPanel onClose={() => setActivePanel(null)} image={editImageUrl} onSave={handleEditorSaveImage} />}
                    {activePanel === 'beauty' && <BeautyRetouchPanel onClose={() => setActivePanel(null)} image={editImageUrl} onSave={handleEditorSaveImage} />}
                    {activePanel === 'background' && <BackgroundToolsPanel onClose={() => setActivePanel(null)} image={editImageUrl} onSave={handleEditorSaveImage} />}
                    {activePanel === 'video' && <VideoToolsPanel onClose={() => setActivePanel(null)} video={editVideoUrl} onSave={handleEditorSaveVideo} />}
                    {activePanel === 'ar' && <ARFilterPanel onClose={() => setActivePanel(null)} image={editImageUrl} onSave={handleEditorSaveImage} />}
                    {activePanel === 'audio' && <AudioPanel onClose={() => setActivePanel(null)} onSave={handleAudioSave} />}
                    {activePanel === 'subtitles' && <SubtitlesPanel onClose={() => setActivePanel(null)} video={editVideoUrl} onSave={handleSubtitlesSave} />}
                  {activePanel === 'sharing' && <CrossPlatformSharingPanel onClose={() => setActivePanel(null)} onShare={(data) => handlePanelSave('crossPlatformSharing', data)} />}
                  {activePanel === 'accessibility' && <AccessibilityPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('accessibility', data)} />}
                  {activePanel === 'business' && <BusinessShoppingPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('businessShopping', data)} />}
                  {activePanel === 'viewing' && <StatusViewingPanel onClose={() => setActivePanel(null)} video={editVideoUrl} onSave={(data) => handlePanelSave('statusViewing', data)} />}
                  {activePanel === 'privacy' && <StatusPrivacyPanel onClose={() => setActivePanel(null)} />}
                  {activePanel === 'management' && <StatusManagementPanel onClose={() => setActivePanel(null)} status={selectedStatusForPanel} onSave={handleStatusManageSave} />}
                  {activePanel === 'chat' && <ChatFeaturesPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('chatFeatures', data)} />}
                  {activePanel === 'customui' && <CustomUIPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('customUI', data)} />}
                  {activePanel === 'contacts' && <ContactsPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('contacts', data)} />}
                  {activePanel === 'advancedChat' && <AdvancedChatFeaturesPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('advancedChat', data)} />}
                  {activePanel === 'voice' && <VoiceFeaturesPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('voiceFeatures', data)} />}
                  {activePanel === 'accessibilityAdv' && <AccessibilityAdvancedPanel onClose={() => setActivePanel(null)} onSave={(data) => handlePanelSave('accessibilityAdvanced', data)} />}
                  {activePanel === 'debug' && <DebugFeaturesPanel onClose={() => setActivePanel(null)} />}
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Panels */}
        {showStatusAnalytics && selectedStatusForPanel && (
          <StatusAnalyticsPanel 
            onClose={() => { setShowStatusAnalytics(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
          />
        )}
        {showThemeStore && <ThemeStore onClose={() => setShowThemeStore(false)} onApplyTheme={(theme) => console.log('Theme applied:', theme)} />}
        {showCrossPlatform && (
          <CrossPlatformSharing 
            onClose={() => setShowCrossPlatform(false)}
            content={selectedStatusForPanel?.caption}
            mediaUrl={selectedStatusForPanel?.mediaUrl}
          />
        )}
        {showStatusAccessibility && selectedStatusForPanel && (
          <StatusAccessibilityPanel 
            onClose={() => { setShowStatusAccessibility(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
          />
        )}
        {showStatusSecurity && selectedStatusForPanel && (
          <StatusSecurityPanel 
            onClose={() => { setShowStatusSecurity(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
          />
        )}
        {showTMPrivacy && <PrivacyModsPanel onClose={() => setShowTMPrivacy(false)} />}
        {showMediaUploadEnhanced && <MediaUploadEnhanced onClose={() => setShowMediaUploadEnhanced(false)} onUpload={(files) => console.log('Files uploaded:', files)} />}
        {showAutoReply && <AutoReplySettings onClose={() => setShowAutoReply(false)} onSave={(settings) => console.log('Auto reply saved:', settings)} />}
        {showMessageSchedule && <MessageSchedule onClose={() => setShowMessageSchedule(false)} message={{ content: '' }} onSchedule={(data) => console.log('Message scheduled:', data)} />}
        {showVoiceChanger && <VoiceChangerPanel onClose={() => setShowVoiceChanger(false)} onApplyEffect={(effect) => console.log('Voice effect applied:', effect)} />}
        {showTextToSpeech && <TextToSpeechPanel onClose={() => setShowTextToSpeech(false)} onGenerateSpeech={(speech) => console.log('Speech generated:', speech)} />}
        {showStatusCollaboration && selectedStatusForPanel && (
          <StatusCollaborationPanel 
            onClose={() => { setShowStatusCollaboration(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onCollaborationUpdate={(settings) => console.log('Collaboration updated:', settings)}
          />
        )}
        {showStatusArchive && <StatusArchivePanel onClose={() => setShowStatusArchive(false)} onArchiveAction={(action) => console.log('Archive action:', action)} />}
        {showStatusReminder && selectedStatusForPanel && (
          <StatusReminderPanel 
            onClose={() => { setShowStatusReminder(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onReminderSet={(reminder) => console.log('Reminder set:', reminder)}
          />
        )}
        {showStatusReaction && selectedStatusForPanel && (
          <StatusReactionPanel 
            onClose={() => { setShowStatusReaction(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onReactionAdd={(reaction) => console.log('Reaction added:', reaction)}
          />
        )}
        {showStatusPoll && selectedStatusForPanel && (
          <StatusPollPanel 
            onClose={() => { setShowStatusPoll(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onPollCreate={(poll) => console.log('Poll created:', poll)}
          />
        )}
        {showStatusScheduler && selectedStatusForPanel && (
          <StatusSchedulerPanel 
            onClose={() => { setShowStatusScheduler(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onScheduleStatus={(schedule) => console.log('Status scheduled:', schedule)}
          />
        )}
        {showLocationTagging && selectedStatusForPanel && (
          <LocationTaggingPanel 
            onClose={() => { setShowLocationTagging(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onLocationAdd={async () => {
              try { await fetchStatuses(); } catch (e) { console.error('Failed to refresh statuses after adding location:', e); }
            }}
          />
        )}
        {showStatusBackup && (
          <StatusBackupPanel 
            onClose={() => setShowStatusBackup(false)}
            onBackupAction={(action) => console.log('Backup action:', action)}
          />
        )}
        {showStatusQRCode && selectedStatusForPanel && (
          <StatusQRCodePanel 
            onClose={() => { setShowStatusQRCode(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
          />
        )}
        {showStatusMentions && selectedStatusForPanel && (
          <StatusMentionsPanel 
            onClose={() => { setShowStatusMentions(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onMentionsAdd={(mentions) => console.log('Mentions added:', mentions)}
          />
        )}
        {showStatusHashtags && selectedStatusForPanel && (
          <StatusHashtagsPanel 
            onClose={() => { setShowStatusHashtags(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onHashtagsAdd={(hashtags) => console.log('Hashtags added:', hashtags)}
          />
        )}
        {showStatusEdit && selectedStatusForPanel && (
          <StatusEditPanel 
            onClose={() => { setShowStatusEdit(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onStatusUpdate={(updated) => console.log('Status updated:', updated)}
          />
        )}
        {showStatusDuplicate && selectedStatusForPanel && (
          <StatusDuplicatePanel 
            onClose={() => { setShowStatusDuplicate(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onDuplicate={(data) => console.log('Status duplicated:', data)}
          />
        )}
        {showStatusPin && selectedStatusForPanel && (
          <StatusPinPanel 
            onClose={() => { setShowStatusPin(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onPinAction={(action) => console.log('Pin action:', action)}
          />
        )}
        {showStatusReport && selectedStatusForPanel && (
          <StatusReportPanel 
            onClose={() => { setShowStatusReport(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onReportSubmit={(report) => console.log('Report submitted:', report)}
          />
        )}
        {showStatusTemplates && (
          <StatusTemplatesPanel 
            onClose={() => setShowStatusTemplates(false)}
            onTemplateSelect={(template) => console.log('Template selected:', template)}
          />
        )}
        {showStatusDrafts && (
          <StatusDraftsPanel 
            onClose={() => setShowStatusDrafts(false)}
            onDraftSelect={(draft) => console.log('Draft selected:', draft)}
            onDraftDelete={(id) => console.log('Draft deleted:', id)}
          />
        )}
        {showStatusFavorites && (
          <StatusFavoritesPanel 
            onClose={() => setShowStatusFavorites(false)}
            onFavoriteAction={(action) => console.log('Favorite action:', action)}
          />
        )}
        {showStatusHistory && (
          <StatusHistoryPanel 
            onClose={() => setShowStatusHistory(false)}
            status={selectedStatusForPanel}
          />
        )}
        {showStatusInsights && selectedStatusForPanel && (
          <StatusInsightsPanel 
            onClose={() => { setShowStatusInsights(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
          />
        )}
        {showStatusShare && selectedStatusForPanel && (
          <StatusSharePanel 
            onClose={() => { setShowStatusShare(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onShare={(data) => console.log('Status shared:', data)}
          />
        )}
        {showStatusDownload && selectedStatusForPanel && (
          <StatusDownloadPanel 
            onClose={() => { setShowStatusDownload(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onDownload={(data) => console.log('Status downloaded:', data)}
          />
        )}
        {showStatusDelete && selectedStatusForPanel && (
          <StatusDeletePanel 
            onClose={() => { setShowStatusDelete(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onDelete={(data) => console.log('Status deleted:', data)}
          />
        )}
        {showStatusMute && selectedStatusForPanel && (
          <StatusMutePanel 
            onClose={() => { setShowStatusMute(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onMute={(data) => console.log('Status muted:', data)}
          />
        )}
        {showStatusBlock && selectedStatusForPanel && (
          <StatusBlockPanel 
            onClose={() => { setShowStatusBlock(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onBlock={(data) => console.log('User blocked:', data)}
          />
        )}
        {showStatusSave && selectedStatusForPanel && (
          <StatusSavePanel 
            onClose={() => { setShowStatusSave(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onSave={(data) => console.log('Status saved:', data)}
          />
        )}
        {showStatusForward && selectedStatusForPanel && (
          <StatusForwardPanel 
            onClose={() => { setShowStatusForward(false); setSelectedStatusForPanel(null); }}
            status={selectedStatusForPanel}
            onForward={(data) => console.log('Status forwarded:', data)}
          />
        )}
      </div>
    </div>
  );
};

export default Status;
