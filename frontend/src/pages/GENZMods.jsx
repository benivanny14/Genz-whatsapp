import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Ghost, MessageSquare, Eye, EyeOff, Clock, Users, Download, Upload, RefreshCw, Trash2, Settings, Zap, Lock, DollarSign, Star, Search, Plus, MapPin, FileText, Camera, Video, Upload as UploadIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import modsService from '../services/modsService';

const GENZMods = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modsSettings, setModsSettings] = useState({
    antiDelete: false,
    antiDeleteStatus: false,
    ghostMode: {
      hideOnline: false,
      hideTyping: false,
      hideReadReceipts: false,
      hideRecording: false,
      freezeLastSeen: false
    },
    hideLastSeen: false,
    hideSecondTick: false,
    hideViewStatus: false,
    hideBlueTickColor: false,
    autoReply: { enabled: false, message: '', keywords: [] },
    antiViewOnce: false,
    voiceEffect: 'none',
    highResMedia: false,
    autoDownloadMedia: false,
    autoSaveMedia: false,
    chatBackgroundMusic: { enabled: false, track: '' },
    readReceipts: true,
    typingIndicators: true,
    onlineStatus: true,
    alwaysOnline: false,
    spamFilter: false,
    selfDestruct: false,
    noForwardLabel: false,
    linkPreview: true,
    clientE2EE: false,
    debugEncryption: false
  });
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [showDeletedMessages, setShowDeletedMessages] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = React.useRef(null);
  
  // GENZ AFTER WORK Feature States
  const [features, setFeatures] = useState([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [showCreateFeatureForm, setShowCreateFeatureForm] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({ message: '', contactEmail: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    price: '',
    maxPrice: '',
    location: '',
    category: 'Real Estate',
    contactInfo: { phone: '', email: '' },
    tags: [],
    specifications: {},
    images: [],
    videos: [],
    isPrivate: false,
    expiresAt: '',
    status: 'pending'
  });
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState([]);
  
  const categories = ['Real Estate', 'Services', 'Business', 'Automotive', 'Jobs', 'Electronics', 'Other'];

  useEffect(() => {
    fetchModsSettings();
  }, []);

  const fetchModsSettings = async () => {
    try {
      setLoading(true);
      const data = await modsService.getModsSettings();
      setModsSettings(data.settings || {});
    } catch (error) {
      setError('Failed to load mods settings');
    } finally {
      setLoading(false);
    }
  };

  const saveModsSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await modsService.updateModsSettings(modsSettings);
      
      // Sync with frontend ChatContext by saving to localStorage
      try {
        const existingLocalMods = JSON.parse(localStorage.getItem('genz_mods') || '{}');
        const updatedLocalMods = {
          ...existingLocalMods,
          antiDelete: modsSettings.antiDelete,
          autoReply: modsSettings.autoReply?.enabled,
          autoReplyMsg: modsSettings.autoReply?.message,
          ghostMode: modsSettings.ghostMode?.hideOnline || modsSettings.ghostMode?.hideTyping || modsSettings.ghostMode?.hideReadReceipts
        };
        localStorage.setItem('genz_mods', JSON.stringify(updatedLocalMods));
        // Force refresh in App/ChatContext by dispatching event
        window.dispatchEvent(new Event('storage'));
      } catch(e) {}
      
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const fetchDeletedMessages = async () => {
    try {
      const data = await modsService.getDeletedMessages();
      setDeletedMessages(data.messages || []);
      setShowDeletedMessages(true);
    } catch (error) {
      setError('Failed to load deleted messages');
    }
  };

  const restoreMessage = async (messageId) => {
    try {
      await modsService.restoreMessage(messageId);
      setDeletedMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSuccess('Message restored successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to restore message');
    }
  };


  const importSettings = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const text = await file.text();
      const settings = JSON.parse(text);
      await modsService.importModSettings(settings);
      await fetchModsSettings();
      setSuccess('Settings imported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to import settings');
    }
    if (event.target) event.target.value = '';
  };

  const exportSettings = async () => {
    try {
      const data = await modsService.exportModSettings();
      const settings = data?.settings || data?.data || data || {};
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'genz-mods-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Settings exported successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to export settings');
    }
  };

  // GENZ AFTER WORK Feature Functions
  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchFeatures = async () => {
    try {
      setIsLoadingFeatures(true);
      let url = `${API_URL}/payment-features?status=active&limit=20`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.slice(0, 5 - images.length);
    setImages(prev => [...prev, ...newImages]);
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreviewUrls(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files);
    const newVideos = files.slice(0, 2 - videos.length);
    setVideos(prev => [...prev, ...newVideos]);
    newVideos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setVideoPreviewUrls(prev => [...prev, e.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateFeature = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(createForm).forEach(key => {
        if (key === 'contactInfo' || key === 'tags' || key === 'specifications') {
          formData.append(key, JSON.stringify(createForm[key]));
        } else {
          formData.append(key, createForm[key]);
        }
      });
      images.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });
      videos.forEach((video, index) => {
        formData.append(`videos[${index}]`, video);
      });
      const response = await fetch(`${API_URL}/payment-features`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        alert('Feature created successfully!');
        setShowCreateFeatureForm(false);
        resetCreateForm();
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating feature:', error);
      alert('Error creating feature');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      price: '',
      maxPrice: '',
      location: '',
      category: 'Real Estate',
      contactInfo: { phone: '', email: '' },
      tags: [],
      specifications: {},
      isPrivate: false,
      expiresAt: '',
      status: 'pending'
    });
    setImages([]);
    setVideos([]);
    setImagePreviewUrls([]);
    setVideoPreviewUrls([]);
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryData.message.trim()) {
      alert('Please enter a message');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/payment-features/${selectedFeature._id}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryData),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        alert('Inquiry submitted successfully!');
        setShowInquiryForm(false);
        setInquiryData({ message: '', contactEmail: '' });
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Error submitting inquiry');
    }
  };

  const handleFeatureClick = async (featureId) => {
    try {
      const response = await fetch(`${API_URL}/payment-features/${featureId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedFeature(data.data);
        // Increment view count
        await fetch(`${API_URL}/payment-features/${featureId}/inquiry`, {
          method: 'POST',
          credentials: 'include'
        });
        fetchFeatures();
      }
    } catch (error) {
      console.error('Error fetching feature details:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'featured': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const updateGhostMode = (key, value) => {
    setModsSettings(prev => ({
      ...prev,
      ghostMode: {
        ...prev.ghostMode,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading GENZ Mods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
               aria-label="Back">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">GENZ Mods</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" title="Import Settings">
                <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </label>
              <button
                onClick={fetchModsSettings}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh Settings" aria-label="Refresh Settings"
              >
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={saveModsSettings}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto px-4 py-6 pb-20">
        <div className="mx-auto max-w-4xl space-y-6">
        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anti-Delete */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anti-Delete</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  See and restore deleted messages
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.antiDelete}
                onChange={(e) => setModsSettings(prev => ({ ...prev, antiDelete: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {modsSettings.antiDelete && (
            <div className="mt-4">
              <button
                onClick={fetchDeletedMessages}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                View Deleted Messages ({deletedMessages.length})
              </button>
            </div>
          )}
        </div>

        {/* Auto-Reply */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Auto-Reply</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically reply to messages when you're busy
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.autoReply?.enabled}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  autoReply: { ...prev.autoReply, enabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {modsSettings.autoReply?.enabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Reply Message
              </label>
              <textarea
                value={modsSettings.autoReply?.message || ''}
                onChange={(e) => setModsSettings(prev => ({
                  ...prev,
                  autoReply: { ...prev.autoReply, message: e.target.value }
                }))}
                placeholder="I'm currently busy. I'll get back to you soon."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Ghost Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Ghost className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ghost Mode</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control your privacy and visibility
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Online Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you're online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideOnline}
                  onChange={(e) => updateGhostMode('hideOnline', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Typing Indicators</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you're typing</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideTyping}
                  onChange={(e) => updateGhostMode('hideTyping', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Read Receipts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Others won't see when you've read messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.hideReadReceipts}
                  onChange={(e) => updateGhostMode('hideReadReceipts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Freeze Last Seen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your last seen time won't update</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.ghostMode?.freezeLastSeen}
                  onChange={(e) => updateGhostMode('freezeLastSeen', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control what others can see
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Read Receipts</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you've read messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.readReceipts}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, readReceipts: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Typing Indicators</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're typing</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.typingIndicators}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, typingIndicators: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Online Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.onlineStatus}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, onlineStatus: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Second Tick</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide message delivery confirmation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideSecondTick}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideSecondTick: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <EyeOff className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide View Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide status view confirmation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideViewStatus}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideViewStatus: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Last Seen</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide your last seen timestamp</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideLastSeen}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideLastSeen: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Always Online</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Always appear online to others</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.alwaysOnline}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, alwaysOnline: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* GENZ AFTER WORK - Payment Features Management */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 border border-blue-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">GENZ AFTER WORK</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage and discover real estate & service features</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => fetchFeatures()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} /> Refresh Features
            </button>
            <button
              onClick={() => setShowCreateFeatureForm(!showCreateFeatureForm)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} /> Create Feature
            </button>
          </div>

          {showCreateFeatureForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Feature</h3>
              <form onSubmit={handleCreateFeature} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Feature Name</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (ZAR)</label>
                    <input
                      type="number"
                      value={createForm.price}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Price (ZAR)</label>
                    <input
                      type="number"
                      value={createForm.maxPrice}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Location</label>
                    <input
                      type="text"
                      value={createForm.location}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Images (Max 5)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <UploadIcon className="w-10 h-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload images</span>
                      </label>
                    </div>
                    {imagePreviewUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Videos (Max 2)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label
                        htmlFor="video-upload"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Video className="w-10 h-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">Click to upload videos</span>
                      </label>
                    </div>
                    {videoPreviewUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {videoPreviewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <video
                              src={url}
                              className="w-full h-20 object-cover rounded-lg bg-gray-100"
                              controls
                            />
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Feature
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateFeatureForm(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoadingFeatures ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature._id}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                  onClick={() => handleFeatureClick(feature._id)}
                >
                  <div className="relative">
                    {feature.primaryImage ? (
                      <img
                        src={feature.primaryImage}
                        alt={feature.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <DollarSign className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {feature.featured && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Star size={14} fill="currentColor" />
                        Featured
                      </span>
                    )}
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(feature.status)}`}>n
                      {feature.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{feature.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{feature.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-600 font-semibold">{formatPrice(feature.price)}</span>
                      <span className="text-xs text-gray-500">to {formatPrice(feature.maxPrice)}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin size={14} className="mr-1" />
                      {feature.formattedLocation || feature.location}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {feature.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {feature.inquiries}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Download className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Media Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Control media handling
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto Download Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically download media files</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.autoDownloadMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, autoDownloadMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto Save Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save media to gallery</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.autoSaveMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, autoSaveMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">High Resolution Media</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Send and receive high quality media</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.highResMedia}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, highResMedia: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Additional privacy and security features
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Anti View Once</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View view-once media multiple times</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.antiViewOnce}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, antiViewOnce: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">No Forward Label</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remove forwarded message labels</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.noForwardLabel}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, noForwardLabel: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Hide Blue Tick Color</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Hide blue tick color on read receipts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.hideBlueTickColor}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, hideBlueTickColor: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Link Preview</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Show link previews in messages</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.linkPreview}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, linkPreview: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Spam Filter</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Filter spam messages automatically</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.spamFilter}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, spamFilter: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Client E2EE</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable client-side end-to-end encryption</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.clientE2EE}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, clientE2EE: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Debug Encryption</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable encryption debugging</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!modsSettings.debugEncryption}
                  onChange={(e) => setModsSettings(prev => ({ ...prev, debugEncryption: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Anti-Delete Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
                <Trash2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anti-Delete Status</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  See and restore deleted status updates
                </p>
              </div>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!modsSettings.antiDeleteStatus}
                onChange={(e) => setModsSettings(prev => ({ ...prev, antiDeleteStatus: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-pink-600"></div>
            </label>
          </div>
        </div>

        {/* Import/Export Settings */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={16} /> Import Settings
          </button>
          <button
            onClick={exportSettings}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export Settings
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={importSettings}
          accept=".json"
          className="hidden"
        />
      </div>

      {/* Deleted Messages Modal */}
      {showDeletedMessages && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deleted Messages</h3>
              <button
                onClick={() => setShowDeletedMessages(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {deletedMessages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No deleted messages found</p>
              ) : (
                <div className="space-y-3">
                  {deletedMessages.map((msg) => (
                    <div key={msg.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-white mb-2">{msg.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleString()}</span>
                        <button
                          onClick={() => restoreMessage(msg.id)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GENZMods;
