import React, { useState } from 'react';
import { HardDrive, X, Download, Upload, Wifi, RefreshCw, BarChart3, Smartphone, Monitor, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DataUsage = ({ dataUsage, onResetUsage, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // day, week, month

  const periods = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const calculateTotal = (usage) => {
    return (usage?.sent || 0) + (usage?.received || 0);
  };

  const periodUsage = dataUsage?.[selectedPeriod] || {
    sent: 0,
    received: 0,
    wifi: { sent: 0, received: 0 },
    mobile: { sent: 0, received: 0 }
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
              <HardDrive size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Data Usage</h2>
              <p className="text-gray-400 text-sm">Monitor your data consumption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Period Selector */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="flex gap-2">
            {periods.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                  selectedPeriod === period.value
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#0b141a] text-gray-400 hover:text-white'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Total Usage */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} className="text-[#00a884]" />
              <h3 className="text-white font-semibold">Total Usage</h3>
            </div>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-white">{formatBytes(calculateTotal(periodUsage))}</p>
              <p className="text-gray-400 text-sm mt-1">Total data used</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-[#1a2e35] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Upload size={14} className="text-green-500" />
                  <span className="text-gray-400 text-xs">Sent</span>
                </div>
                <p className="text-white font-bold">{formatBytes(periodUsage.sent)}</p>
              </div>
              <div className="bg-[#1a2e35] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Download size={14} className="text-blue-500" />
                  <span className="text-gray-400 text-xs">Received</span>
                </div>
                <p className="text-white font-bold">{formatBytes(periodUsage.received)}</p>
              </div>
            </div>
          </div>

          {/* Network Type Breakdown */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={18} className="text-[#00a884]" />
              <h3 className="text-white font-semibold">Network Type</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-sm">Wi-Fi</span>
                  <span className="text-white text-sm">{formatBytes(calculateTotal(periodUsage.wifi))}</span>
                </div>
                <div className="w-full bg-[#1a2e35] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#00a884] h-full rounded-full"
                    style={{ width: `${(calculateTotal(periodUsage.wifi) / calculateTotal(periodUsage)) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-sm">Mobile Data</span>
                  <span className="text-white text-sm">{formatBytes(calculateTotal(periodUsage.mobile))}</span>
                </div>
                <div className="w-full bg-[#1a2e35] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${(calculateTotal(periodUsage.mobile) / calculateTotal(periodUsage)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* App Usage */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone size={18} className="text-[#00a884]" />
              <h3 className="text-white font-semibold">App Usage</h3>
            </div>
            <div className="space-y-2">
              {dataUsage?.appUsage?.map((app, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#1a2e35] rounded-lg flex items-center justify-center">
                      <Monitor size={16} className="text-gray-400" />
                    </div>
                    <span className="text-white text-sm">{app.name}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{formatBytes(app.usage)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning if high usage */}
          {calculateTotal(periodUsage) > 1024 * 1024 * 1024 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-yellow-500 text-xs">
                  High data usage detected. Consider connecting to Wi-Fi or adjusting your settings.
                </p>
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={onResetUsage}
            className="w-full bg-[#0b141a] text-gray-400 py-3 rounded-lg hover:bg-[#1a2e35] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Reset Statistics
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Data Usage Settings Component
export const DataUsageSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <HardDrive size={18} className="text-[#00a884]" />
            Data Usage
          </p>
          <p className="text-gray-400 text-sm">Monitor data consumption</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, dataUsageEnabled: !settings.dataUsageEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.dataUsageEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.dataUsageEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.dataUsageEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Data saver mode</p>
              <p className="text-gray-400 text-xs">Reduce data usage</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dataSaverMode: !settings.dataSaverMode })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dataSaverMode ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dataSaverMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-download media</p>
              <p className="text-gray-400 text-xs">Download on Wi-Fi only</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, wifiOnlyDownload: !settings.wifiOnlyDownload })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.wifiOnlyDownload ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.wifiOnlyDownload ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Low data usage limit</p>
            <select
              value={settings.dataLimit || '1gb'}
              onChange={(e) => onUpdate({ ...settings, dataLimit: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="500mb">500 MB</option>
              <option value="1gb">1 GB</option>
              <option value="2gb">2 GB</option>
              <option value="5gb">5 GB</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show usage warning</p>
              <p className="text-gray-400 text-xs">Alert when limit reached</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showUsageWarning: !settings.showUsageWarning })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showUsageWarning ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showUsageWarning ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Data Usage Indicator Component
export const DataUsageIndicator = ({ currentUsage, limit }) => {
  const percentage = limit ? Math.round((currentUsage / limit) * 100) : 0;
  const isOverLimit = limit && currentUsage > limit;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-[#00a884]" />
          <span className="text-white text-sm">Data Usage</span>
        </div>
        <span className={`${isOverLimit ? 'text-red-500' : 'text-gray-400'} text-xs`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-[#1a2e35] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOverLimit ? 'bg-red-500' : 'bg-[#00a884]'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-gray-500 text-xs">{formatBytes(currentUsage)} used</span>
        {limit && <span className="text-gray-500 text-xs">{formatBytes(limit)} limit</span>}
      </div>
    </div>
  );
};

// Network Type Indicator Component
export const NetworkTypeIndicator = ({ networkType }) => {
  const networkTypes = {
    wifi: { icon: Wifi, color: 'text-green-500', label: 'Wi-Fi' },
    mobile: { icon: Smartphone, color: 'text-blue-500', label: 'Mobile Data' },
    offline: { icon: AlertCircle, color: 'text-gray-500', label: 'Offline' }
  };

  const config = networkTypes[networkType] || networkTypes.offline;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      <Icon size={16} />
      <span className="text-sm">{config.label}</span>
    </div>
  );
};

export default DataUsage;
