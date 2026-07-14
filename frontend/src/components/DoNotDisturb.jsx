import React, { useState } from 'react';
import { Moon, X, Clock, Check, Bell, AlertCircle, Calendar, Repeat, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DoNotDisturb = ({ settings, onUpdate, onClose }) => {
  const [isDndEnabled, setIsDndEnabled] = useState(settings.dndEnabled || false);
  const [scheduleMode, setScheduleMode] = useState(settings.dndScheduleMode || 'manual'); // manual, scheduled
  const [startTime, setStartTime] = useState(settings.dndStartTime || '22:00');
  const [endTime, setEndTime] = useState(settings.dndEndTime || '07:00');
  const [selectedDays, setSelectedDays] = useState(settings.dndDays || [1, 2, 3, 4, 5, 6, 0]);

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleToggleDay = (dayIndex) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleSave = () => {
    onUpdate({
      ...settings,
      dndEnabled: isDndEnabled,
      dndScheduleMode: scheduleMode,
      dndStartTime: startTime,
      dndEndTime: endTime,
      dndDays: selectedDays
    });
    onClose();
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
              <Moon size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Do Not Disturb</h2>
              <p className="text-gray-400 text-sm">Silence notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* DND Toggle */}
          <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon size={24} className={isDndEnabled ? 'text-[#00a884]' : 'text-gray-400'} />
                <div>
                  <p className="text-white font-medium">Do Not Disturb</p>
                  <p className="text-gray-400 text-sm">
                    {isDndEnabled ? 'Currently enabled' : 'Currently disabled'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDndEnabled(!isDndEnabled)}
                className={`w-12 h-6 rounded-full transition-all ${
                  isDndEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-all ${
                    isDndEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Schedule Mode */}
          {isDndEnabled && (
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <p className="text-white font-medium mb-3">Schedule</p>
              <div className="space-y-2">
                <button
                  onClick={() => setScheduleMode('manual')}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    scheduleMode === 'manual'
                      ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                      : 'bg-[#1a2e35] border-2 border-[#00a884]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white">Manual</span>
                    {scheduleMode === 'manual' && <Check size={18} className="text-[#00a884]" />}
                  </div>
                </button>
                <button
                  onClick={() => setScheduleMode('scheduled')}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    scheduleMode === 'scheduled'
                      ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                      : 'bg-[#1a2e35] border-2 border-[#00a884]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white">Scheduled</span>
                    {scheduleMode === 'scheduled' && <Check size={18} className="text-[#00a884]" />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Scheduled Settings */}
          {isDndEnabled && scheduleMode === 'scheduled' && (
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 space-y-4">
              <div>
                <p className="text-white font-medium mb-2">Time Range</p>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 bg-[#1a2e35] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 bg-[#1a2e35] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-white font-medium mb-2">Repeat</p>
                <div className="flex gap-2">
                  {days.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => handleToggleDay(index)}
                      className={`w-10 h-10 rounded-lg text-sm transition-all ${
                        selectedDays.includes(index)
                          ? 'bg-[#00a884] text-white'
                          : 'bg-[#1a2e35] text-gray-400 hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exception Settings */}
          {isDndEnabled && (
            <div className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20">
              <p className="text-white font-medium mb-3">Exceptions</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Allow calls from favorites</span>
                  <button
                    onClick={() => onUpdate({ ...settings, dndAllowFavorites: !settings.dndAllowFavorites })}
                    className={`w-10 h-5 rounded-full transition-all ${
                      settings.dndAllowFavorites ? 'bg-[#00a884]' : 'bg-[#1a2e35]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-all ${
                        settings.dndAllowFavorites ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Allow repeat calls</span>
                  <button
                    onClick={() => onUpdate({ ...settings, dndAllowRepeat: !settings.dndAllowRepeat })}
                    className={`w-10 h-5 rounded-full transition-all ${
                      settings.dndAllowRepeat ? 'bg-[#00a884]' : 'bg-[#1a2e35]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-all ${
                        settings.dndAllowRepeat ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          {isDndEnabled && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
                <p className="text-yellow-500 text-xs">
                  You won't receive notifications while Do Not Disturb is enabled. Emergency calls may still come through.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// DND Button Component
export const DndButton = ({ isEnabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-full transition-colors ${
        isEnabled
          ? 'text-[#00a884] hover:bg-[#00a884]/10'
          : 'text-gray-400 hover:text-white'
      }`}
      title={isEnabled ? 'Disable DND' : 'Enable DND'}
    >
      <Moon size={18} />
    </button>
  );
};

// DND Indicator Component
export const DndIndicator = ({ isEnabled, schedule }) => {
  return (
    <AnimatePresence>
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-[#00a884]/20 border border-[#00a884] rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Moon size={16} className="text-[#00a884]" />
          <span className="text-[#00a884] text-sm">
            {schedule ? `DND until ${schedule.endTime}` : 'DND On'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// DND Settings Component
export const DndSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Moon size={18} className="text-[#00a884]" />
            Do Not Disturb
          </p>
          <p className="text-gray-400 text-sm">Silence notifications</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, dndEnabled: !settings.dndEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.dndEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.dndEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.dndEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow calls from favorites</p>
              <p className="text-gray-400 text-xs">Bypass DND for favorites</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dndAllowFavorites: !settings.dndAllowFavorites })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dndAllowFavorites ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dndAllowFavorites ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Allow repeat calls</p>
              <p className="text-gray-400 text-xs">Bypass DND for repeat calls</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dndAllowRepeat: !settings.dndAllowRepeat })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dndAllowRepeat ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dndAllowRepeat ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Silence unknown callers</p>
              <p className="text-gray-400 text-xs">Silence calls from unknown numbers</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, dndSilenceUnknown: !settings.dndSilenceUnknown })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.dndSilenceUnknown ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.dndSilenceUnknown ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Scheduled DND Component
export const ScheduledDND = ({ schedule, onEdit, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
            <Moon size={18} className="text-[#00a884]" />
          </div>
          <div>
            <p className="text-white font-medium">Scheduled DND</p>
            <p className="text-gray-400 text-sm">
              {schedule.startTime} - {schedule.endTime}
            </p>
            <p className="text-gray-500 text-xs">
              {schedule.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Repeat size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DoNotDisturb;
