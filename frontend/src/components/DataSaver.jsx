import React, { useState } from 'react';
import { Zap, X, Wifi, Signal, Download, Upload, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DataSaver = ({ settings, onUpdate, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    onClose();
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
            <Zap className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Data Saver</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Enable Data Saver</p>
              <p className="text-gray-400 text-sm">Reduce data usage</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dataSaverEnabled: !settings.dataSaverEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dataSaverEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dataSaverEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {settings.dataSaverEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
              {/* Network Type */}
              <div>
                <p className="text-white text-sm mb-2">Apply to</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdate({ ...settings, dataSaverNetwork: 'mobile' })}
                    className={`p-3 rounded-lg text-center transition-all ${
                      settings.dataSaverNetwork === 'mobile'
                        ? 'bg-[#00a884] text-white'
                        : 'bg-[#0b141a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Signal size={16} className="mx-auto mb-1" />
                    <span className="text-sm">Mobile Data</span>
                  </button>
                  <button
                    onClick={() => onUpdate({ ...settings, dataSaverNetwork: 'wifi' })}
                    className={`p-3 rounded-lg text-center transition-all ${
                      settings.dataSaverNetwork === 'wifi'
                        ? 'bg-[#00a884] text-white'
                        : 'bg-[#0b141a] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Wifi size={16} className="mx-auto mb-1" />
                    <span className="text-sm">Wi-Fi</span>
                  </button>
                </div>
              </div>

              {/* Media Settings */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Lower image quality</p>
                  <p className="text-gray-400 text-xs">Compress images</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, lowerImageQuality: !settings.lowerImageQuality })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.lowerImageQuality ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.lowerImageQuality ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Lower video quality</p>
                  <p className="text-gray-400 text-xs">Compress videos</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, lowerVideoQuality: !settings.lowerVideoQuality })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.lowerVideoQuality ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.lowerVideoQuality ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Disable auto-downloads</p>
                  <p className="text-gray-400 text-xs">Manual download only</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, disableAutoDownloads: !settings.disableAutoDownloads })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.disableAutoDownloads ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.disableAutoDownloads ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm">Disable status updates</p>
                  <p className="text-gray-400 text-xs">No auto status download</p>
                </div>
                <button
                  onClick={() => onUpdate({ ...settings, disableStatusAutoDownload: !settings.disableStatusAutoDownload })}
                  className={`w-12 h-6 rounded-full transition-all ${
                    settings.disableStatusAutoDownload ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-all ${
                      settings.disableStatusAutoDownload ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Data Usage Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-blue-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-blue-500 text-xs">
                Data Saver reduces media quality and disables automatic downloads to save mobile data.
              </p>
            </div>
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

// Data Saver Settings Component
export const DataSaverSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Zap size={18} className="text-[#00a884]" />
            Data Saver
          </p>
          <p className="text-gray-400 text-sm">Reduce data usage</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, dataSaverEnabled: !settings.dataSaverEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.dataSaverEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.dataSaverEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.dataSaverEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-enable on mobile data</p>
              <p className="text-gray-400 text-xs">Activate when using cellular</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoEnableMobile: !settings.autoEnableMobile })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoEnableMobile ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoEnableMobile ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show data usage warning</p>
              <p className="text-gray-400 text-xs">Alert at data limit</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showDataWarning: !settings.showDataWarning })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showDataWarning ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showDataWarning ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Data limit (MB)</p>
            <input
              type="number"
              value={settings.dataLimit || 500}
              onChange={(e) => onUpdate({ ...settings, dataLimit: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              placeholder="500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Data Saver Button Component
export const DataSaverButton = ({ onOpen, isEnabled }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Data saver"
    >
      {isEnabled ? <Zap size={18} className="text-[#00a884]" /> : <Zap size={18} />}
    </button>
  );
};

// Data Saver Indicator Component
export const DataSaverIndicator = ({ isEnabled }) => {
  return (
    <AnimatePresence>
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500 rounded-full px-3 py-1"
        >
          <Zap size={14} className="text-yellow-500" />
          <span className="text-white text-xs">Data Saver</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Data Usage Display Component
export const DataUsageDisplay = ({ dataUsed, dataLimit }) => {
  const percentage = dataLimit > 0 ? (dataUsed / dataLimit) * 100 : 0;
  const isOverLimit = percentage > 100;

  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-[#00a884]" />
          <span className="text-white text-sm">Data Used</span>
        </div>
        <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {dataUsed} MB / {dataLimit} MB
        </span>
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isOverLimit ? 'bg-red-500' : 'bg-[#00a884]'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isOverLimit && (
        <p className="text-red-500 text-xs mt-2">Data limit exceeded</p>
      )}
    </div>
  );
};

// Network Type Indicator Component
export const NetworkTypeIndicator = ({ networkType }) => {
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      {networkType === 'mobile' ? (
        <>
          <Signal size={12} />
          <span>Mobile Data</span>
        </>
      ) : (
        <>
          <Wifi size={12} />
          <span>Wi-Fi</span>
        </>
      )}
    </div>
  );
};

export default DataSaver;
