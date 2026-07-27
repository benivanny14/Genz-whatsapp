import React, { useState, useEffect } from 'react';
import { MapPin, X, Navigation, StopCircle, Clock, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LiveLocationSharing = ({ activeShares, onStartSharing, onStopSharing, onClose }) => {
  const [duration, setDuration] = useState('1h'); // 15m, 1h, 8h
  const [isSharing, setIsSharing] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  const durationOptions = [
    { id: '15m', label: '15 minutes', value: 15 },
    { id: '1h', label: '1 hour', value: 60 },
    { id: '8h', label: '8 hours', value: 480 },
  ];

  const handleStartSharing = async () => {
    setIsSharing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSharing(false);
    if (onStartSharing) {
      onStartSharing({
        duration: durationOptions.find(d => d.id === duration)?.value,
        contacts: selectedContacts
      });
    }
  };

  const handleStopSharing = (shareId) => {
    if (onStopSharing) {
      onStopSharing(shareId);
    }
  };

  const formatTimeRemaining = (endTime) => {
    const remaining = new Date(endTime) - new Date();
    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
              <MapPin size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Live Location</h2>
              <p className="text-gray-400 text-sm">{activeShares.length} active shares</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Active Shares */}
        {activeShares.length > 0 && (
          <div className="p-4 border-b border-[#00a884]/20">
            <p className="text-gray-400 text-sm mb-3">Active Shares</p>
            <div className="space-y-2">
              {activeShares.map(share => (
                <motion.div
                  key={share._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                        <Navigation size={18} className="text-[#00a884]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{share.contactName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{formatTimeRemaining(share.endTime)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStopSharing(share._id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                      title="Stop sharing"
                    >
                      <StopCircle size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* New Share */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-white font-medium mb-4">Share Live Location</p>

          {/* Duration Selection */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Duration</p>
            <div className="grid grid-cols-3 gap-2">
              {durationOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setDuration(option.id)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    duration === option.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Selection */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Share with</p>
            <div className="space-y-2">
              {['Everyone', 'My contacts', 'Select contacts'].map(option => (
                <button
                  key={option}
                  onClick={() => setSelectedContacts([option])}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedContacts.includes(option)
                      ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                      : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white">{option}</span>
                    {selectedContacts.includes(option) && (
                      <div className="w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-yellow-500 text-xs">
                Your location will be shared in real-time. Recipients can see your movement on a map.
              </p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleStartSharing}
            disabled={isSharing || selectedContacts.length === 0}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSharing ? (
              <>
                <RefreshCw className="animate-spin" size={18} />
                Starting...
              </>
            ) : (
              <>
                <Navigation size={18} />
                Start Sharing
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Live Location Indicator Component
export const LiveLocationIndicator = ({ share }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-[#00a884]/20 border border-[#00a884] rounded-full px-3 py-1"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Navigation size={14} className="text-[#00a884]" />
      </motion.div>
      <span className="text-white text-xs">Live</span>
    </motion.div>
  );
};

// Live Location Map View Component
export const LiveLocationMapView = ({ shares, onUserClick }) => {
  return (
    <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={18} className="text-[#00a884]" />
        <span className="text-white font-medium">Live Locations</span>
      </div>
      
      {/* Map Placeholder */}
      <div className="bg-[#1a2e35] rounded-lg h-48 mb-3 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/10 to-[#00a884]/5" />
        <MapPin size={48} className="text-[#00a884]/50" />
        <p className="text-gray-400 text-sm absolute bottom-2">Map View</p>
      </div>

      {/* Location List */}
      <div className="space-y-2">
        {shares.map(share => (
          <button
            key={share._id}
            onClick={() => onUserClick?.(share)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#00a884]/10 transition-colors"
          >
            <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Navigation size={14} className="text-[#00a884]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white text-sm">{share.contactName}</p>
              <p className="text-gray-400 text-xs">{share.distance} away</p>
            </div>
            <div className="text-[#00a884] text-xs">
              {share.updatedAt}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Live Location Settings Component
export const LiveLocationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Navigation size={18} className="text-[#00a884]" />
            Live Location
          </p>
          <p className="text-gray-400 text-sm">Share real-time location</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, liveLocationEnabled: !settings.liveLocationEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.liveLocationEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.liveLocationEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.liveLocationEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-stop after duration</p>
              <p className="text-gray-400 text-xs">Stop sharing automatically</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoStopLocation: !settings.autoStopLocation })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoStopLocation ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoStopLocation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show location accuracy</p>
              <p className="text-gray-400 text-xs">Display precision level</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showLocationAccuracy: !settings.showLocationAccuracy })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showLocationAccuracy ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showLocationAccuracy ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default duration</p>
            <select
              value={settings.defaultDuration || '1h'}
              onChange={(e) => onUpdate({ ...settings, defaultDuration: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="8h">8 hours</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Live Location Button Component
export const LiveLocationButton = ({ onOpen, activeShares }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors relative"
      title="Live location"
    >
      <Navigation size={18} />
      {activeShares > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {activeShares}
        </span>
      )}
    </button>
  );
};

export default LiveLocationSharing;
