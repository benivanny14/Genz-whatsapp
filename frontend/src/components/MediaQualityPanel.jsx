import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Settings, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Zap
} from 'lucide-react';

const MediaQualityPanel = ({ onClose }) => {
  const [imageQuality, setImageQuality] = useState('high');
  const [videoQuality, setVideoQuality] = useState('high');
  const [audioQuality, setAudioQuality] = useState('high');
  const [autoCompressImages, setAutoCompressImages] = useState(true);
  const [autoCompressVideos, setAutoCompressVideos] = useState(true);
  const [autoCompressAudio, setAutoCompressAudio] = useState(true);
  const [maxImageSize, setMaxImageSize] = useState(10);
  const [maxVideoSize, setMaxVideoSize] = useState(100);
  const [maxAudioSize, setMaxAudioSize] = useState(25);
  const [preserveMetadata, setPreserveMetadata] = useState(false);
  const [enableWebP, setEnableWebP] = useState(true);
  const [enableHEIC, setEnableHEIC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/media-quality/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setImageQuality(data.settings.imageQuality);
        setVideoQuality(data.settings.videoQuality);
        setAudioQuality(data.settings.audioQuality);
        setAutoCompressImages(data.settings.autoCompressImages);
        setAutoCompressVideos(data.settings.autoCompressVideos);
        setAutoCompressAudio(data.settings.autoCompressAudio);
        setMaxImageSize(data.settings.maxImageSize);
        setMaxVideoSize(data.settings.maxVideoSize);
        setMaxAudioSize(data.settings.maxAudioSize);
        setPreserveMetadata(data.settings.preserveMetadata);
        setEnableWebP(data.settings.enableWebP);
        setEnableHEIC(data.settings.enableHEIC);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/media-quality/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageQuality,
          videoQuality,
          audioQuality,
          autoCompressImages,
          autoCompressVideos,
          autoCompressAudio,
          maxImageSize,
          maxVideoSize,
          maxAudioSize,
          preserveMetadata,
          enableWebP,
          enableHEIC
        })
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const qualityOptions = [
    { value: 'low', label: 'Low (Smallest size)' },
    { value: 'medium', label: 'Medium (Balanced)' },
    { value: 'high', label: 'High (Better quality)' },
    { value: 'original', label: 'Original (No compression)' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Media Quality Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Image Quality */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-700">Image Quality</h4>
            </div>
            <select
              value={imageQuality}
              onChange={(e) => setImageQuality(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {qualityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Video Quality */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-700">Video Quality</h4>
            </div>
            <select
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {qualityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Audio Quality */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-700">Audio Quality</h4>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {qualityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Auto-Compress Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Auto-Compression</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Auto-compress images</p>
                <p className="text-xs text-gray-500">Automatically compress sent images</p>
              </div>
              <input
                type="checkbox"
                checked={autoCompressImages}
                onChange={(e) => setAutoCompressImages(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Auto-compress videos</p>
                <p className="text-xs text-gray-500">Automatically compress sent videos</p>
              </div>
              <input
                type="checkbox"
                checked={autoCompressVideos}
                onChange={(e) => setAutoCompressVideos(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Auto-compress audio</p>
                <p className="text-xs text-gray-500">Automatically compress sent audio</p>
              </div>
              <input
                type="checkbox"
                checked={autoCompressAudio}
                onChange={(e) => setAutoCompressAudio(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>

          {/* File Size Limits */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Max File Sizes (MB)</h4>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm text-gray-800 mb-1 block">Max Image Size</label>
              <input
                type="number"
                value={maxImageSize}
                onChange={(e) => setMaxImageSize(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm text-gray-800 mb-1 block">Max Video Size</label>
              <input
                type="number"
                value={maxVideoSize}
                onChange={(e) => setMaxVideoSize(parseInt(e.target.value))}
                min="1"
                max="500"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="text-sm text-gray-800 mb-1 block">Max Audio Size</label>
              <input
                type="number"
                value={maxAudioSize}
                onChange={(e) => setMaxAudioSize(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Advanced</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Preserve metadata</p>
                <p className="text-xs text-gray-500">Keep EXIF data in images</p>
              </div>
              <input
                type="checkbox"
                checked={preserveMetadata}
                onChange={(e) => setPreserveMetadata(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Enable WebP</p>
                <p className="text-xs text-gray-500">Convert images to WebP format</p>
              </div>
              <input
                type="checkbox"
                checked={enableWebP}
                onChange={(e) => setEnableWebP(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Enable HEIC</p>
                <p className="text-xs text-gray-500">Support HEIC image format</p>
              </div>
              <input
                type="checkbox"
                checked={enableHEIC}
                onChange={(e) => setEnableHEIC(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MediaQualityPanel;
