import React, { useState } from 'react';
import { Download, X, Image as ImageIcon, Video, FileText, Check, RefreshCw, Settings, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DownloadQuality = ({ settings, onUpdate, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const qualityOptions = {
    image: ['auto', 'high', 'medium', 'low'],
    video: ['auto', 'high', 'medium', 'low'],
    document: ['auto', 'high', 'low']
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    onClose();
  };

  const getQualityLabel = (quality) => {
    const labels = {
      auto: 'Auto',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    return labels[quality] || quality;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Download className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Download Quality</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={16} className="text-[#00a884]" />
              <p className="text-white font-medium">Image Quality</p>
            </div>
            <select
              value={settings.imageQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, imageQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              {qualityOptions.image.map(option => (
                <option key={option} value={option}>{getQualityLabel(option)}</option>
              ))}
            </select>
          </div>

          {/* Video Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video size={16} className="text-[#00a884]" />
              <p className="text-white font-medium">Video Quality</p>
            </div>
            <select
              value={settings.videoQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, videoQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              {qualityOptions.video.map(option => (
                <option key={option} value={option}>{getQualityLabel(option)}</option>
              ))}
            </select>
          </div>

          {/* Document Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-[#00a884]" />
              <p className="text-white font-medium">Document Quality</p>
            </div>
            <select
              value={settings.documentQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, documentQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              {qualityOptions.document.map(option => (
                <option key={option} value={option}>{getQualityLabel(option)}</option>
              ))}
            </select>
          </div>

          {/* Auto-download Settings */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-download on Wi-Fi</p>
              <p className="text-gray-400 text-xs">Download when connected</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDownloadWifi: !settings.autoDownloadWifi })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDownloadWifi ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDownloadWifi ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-download on mobile data</p>
              <p className="text-gray-400 text-xs">Use cellular data</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDownloadMobile: !settings.autoDownloadMobile })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDownloadMobile ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDownloadMobile ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
          {isSaving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Check size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// Download Quality Settings Component
export const DownloadQualitySettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Download size={18} className="text-[#00a884]" />
            Download Quality
          </p>
          <p className="text-gray-400 text-sm">Media download settings</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, downloadQualityEnabled: !settings.downloadQualityEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.downloadQualityEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.downloadQualityEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.downloadQualityEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Default image quality</p>
            <select
              value={settings.defaultImageQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, defaultImageQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default video quality</p>
            <select
              value={settings.defaultVideoQuality || 'auto'}
              onChange={(e) => onUpdate({ ...settings, defaultVideoQuality: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="high">High (720p)</option>
              <option value="medium">Medium (480p)</option>
              <option value="low">Low (360p)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Ask before download</p>
              <p className="text-gray-400 text-xs">Confirm each download</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, askBeforeDownload: !settings.askBeforeDownload })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.askBeforeDownload ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.askBeforeDownload ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Download Quality Button Component
export const DownloadQualityButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Download quality"
    >
      <Download size={18} />
    </button>
  );
};

// Download Quality Indicator Component
export const DownloadQualityIndicator = ({ quality }) => {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <Download size={12} />
      <span className="capitalize">{quality}</span>
    </div>
  );
};

// Quick Quality Selector Component
export const QuickQualitySelector = ({ type, currentQuality, onChange }) => {
  const qualities = ['auto', 'high', 'medium', 'low'];

  return (
    <div className="flex gap-2">
      {qualities.map(quality => (
        <button
          key={quality}
          onClick={() => onChange?.(quality)}
          className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
            currentQuality === quality
              ? 'bg-[#00a884] text-white'
              : 'bg-[#0b141a] text-gray-400 hover:text-white'
          }`}
        >
          {quality}
        </button>
      ))}
    </div>
  );
};

// Download Progress Component
export const DownloadProgress = ({ progress, quality, onCancel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-[#00a884]" />
          <span className="text-white text-sm">Downloading</span>
        </div>
        <DownloadQualityIndicator quality={quality} />
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2 mb-2">
        <div
          className="bg-[#00a884] h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-xs">{progress}%</span>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-red-500 transition-colors text-xs"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
};

export default DownloadQuality;
