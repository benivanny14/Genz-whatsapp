import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Calendar, Clock, Repeat, Bell, CheckCircle, AlertCircle, Zap } from 'lucide-react';

const StatusSchedulerPanel = ({ onClose, status, onScheduleStatus }) => {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [repeatOption, setRepeatOption] = useState('none');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [autoPost, setAutoPost] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);

  const repeatOptions = [
    { id: 'none', label: 'No Repeat' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom' }
  ];

  const timezones = [
    'UTC',
    'Africa/Dar_es_Salaam',
    'Africa/Nairobi',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Tokyo'
  ];

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Please select both date and time');
      return;
    }

    setIsScheduling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scheduledTime: `${scheduledDate}T${scheduledTime}`
        })
      });

      const data = await response.json();
      if (data.success) {
        const scheduledData = {
          date: scheduledDate,
          time: scheduledTime,
          repeat: repeatOption,
          timezone,
          notificationEnabled,
          autoPost
        };

        if (onScheduleStatus) {
          onScheduleStatus(scheduledData);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error scheduling status:', error);
      alert('Failed to schedule status. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const getScheduledDateTime = () => {
    if (!scheduledDate || !scheduledTime) return null;
    return new Date(`${scheduledDate}T${scheduledTime}`);
  };

  const isPastDate = () => {
    const scheduled = getScheduledDateTime();
    if (!scheduled) return false;
    return scheduled < new Date();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Schedule Status</h2>
              <p className="text-white/60 text-xs">Auto-post at specific time</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Select Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Select Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz} className="bg-[#1a2e35]">
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Repeat Option */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Repeat</label>
            <select
              value={repeatOption}
              onChange={(e) => setRepeatOption(e.target.value)}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            >
              {repeatOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-[#1a2e35]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Send notification before posting</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPost}
                onChange={(e) => setAutoPost(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-[#00a884] focus:ring-[#00a884]"
              />
              <span className="text-white text-sm">Auto-post without confirmation</span>
            </label>
          </div>

          {/* Warning */}
          {isPastDate() && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="text-red-400" size={18} />
              <p className="text-red-400 text-sm">Selected date is in the past</p>
            </div>
          )}

          {/* Preview */}
          {scheduledDate && scheduledTime && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-[#00a884]" size={18} />
                <p className="text-white font-medium">Scheduled Time</p>
              </div>
              <p className="text-white text-lg">
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
              </p>
              <p className="text-white/60 text-sm mt-1">{timezone}</p>
              {repeatOption !== 'none' && (
                <div className="flex items-center gap-2 mt-2">
                  <Repeat className="text-[#00a884]" size={14} />
                  <span className="text-white/60 text-sm capitalize">{repeatOption}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSchedule}
            disabled={!scheduledDate || !scheduledTime || isPastDate()}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Schedule Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusSchedulerPanel;
