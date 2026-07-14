import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, Plus, X, Check, Trash2, Edit, Repeat, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Reminders = ({ message, onSetReminder, onClose }) => {
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [repeatOption, setRepeatOption] = useState('none');
  const [reminders, setReminders] = useState([]);

  const repeatOptions = [
    { value: 'none', label: 'Don\'t repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  const handleSetReminder = () => {
    if (!reminderTime || !reminderDate) return;

    const reminder = {
      id: Date.now(),
      messageId: message._id,
      message: message.content,
      time: reminderTime,
      date: reminderDate,
      note: reminderNote,
      repeat: repeatOption,
      completed: false,
      createdAt: Date.now()
    };

    setReminders([...reminders, reminder]);
    
    if (onSetReminder) {
      onSetReminder(reminder);
    }

    setShowReminderModal(false);
    setReminderTime('');
    setReminderDate('');
    setReminderNote('');
    setRepeatOption('none');
  };

  const handleCompleteReminder = (reminderId) => {
    setReminders(reminders.map(r =>
      r.id === reminderId ? { ...r, completed: true } : r
    ));
  };

  const handleDeleteReminder = (reminderId) => {
    setReminders(reminders.filter(r => r.id !== reminderId));
  };

  const formatReminderTime = (date, time) => {
    const reminderDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diff = reminderDate - now;

    if (diff < 0) return 'Past';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <>
      {/* Reminder Button */}
      <button
        onClick={() => setShowReminderModal(!showReminderModal)}
        className="text-gray-400 hover:text-[#00a884] transition-colors"
        title="Set reminder"
      >
        <Bell size={16} />
      </button>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 z-50 w-80"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <Bell size={18} className="text-[#00a884]" />
                  Set Reminder
                </h4>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Date</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Time</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Repeat</label>
                  <select
                    value={repeatOption}
                    onChange={(e) => setRepeatOption(e.target.value)}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  >
                    {repeatOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Note (optional)</label>
                  <input
                    type="text"
                    value={reminderNote}
                    onChange={(e) => setReminderNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleSetReminder}
                  disabled={!reminderDate || !reminderTime}
                  className="w-full bg-[#00a884] text-white py-2 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                >
                  Set Reminder
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Reminders */}
      {reminders.length > 0 && (
        <div className="mt-2 space-y-2">
          {reminders.map(reminder => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                reminder.completed ? 'bg-green-500/20' : 'bg-[#00a884]/20'
              }`}
            >
              <Clock size={14} className={reminder.completed ? 'text-green-400' : 'text-[#00a884]'} />
              <div className="flex-1">
                <p className="text-white text-xs font-medium">
                  {reminder.date} at {reminder.time}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatReminderTime(reminder.date, reminder.time)} remaining
                </p>
              </div>
              {!reminder.completed && (
                <button
                  onClick={() => handleCompleteReminder(reminder.id)}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  <Check size={14} />
                </button>
              )}
              <button
                onClick={() => handleDeleteReminder(reminder.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
};

// Reminders List Component
export const RemindersList = ({ reminders, onComplete, onDelete, onEdit }) => {
  const [filter, setFilter] = useState('all'); // all, active, completed

  const filteredReminders = reminders.filter(r => {
    if (filter === 'active') return !r.completed;
    if (filter === 'completed') return r.completed;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Bell size={20} className="text-[#00a884]" />
          Reminders ({reminders.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-[#00a884] text-white' : 'bg-[#0b141a] text-gray-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'active' ? 'bg-[#00a884] text-white' : 'bg-[#0b141a] text-gray-400'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === 'completed' ? 'bg-[#00a884] text-white' : 'bg-[#0b141a] text-gray-400'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredReminders.map(reminder => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-[#0b141a] rounded-lg p-4 border-l-4 ${
              reminder.completed ? 'border-green-500' : 'border-[#00a884]'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-white font-medium mb-1">{reminder.message}</p>
                {reminder.note && (
                  <p className="text-gray-400 text-sm mb-2">{reminder.note}</p>
                )}
                <div className="flex items-center gap-3 text-gray-500 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {reminder.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {reminder.time}
                  </span>
                  {reminder.repeat !== 'none' && (
                    <span className="flex items-center gap-1">
                      <Repeat size={12} />
                      {reminder.repeat}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!reminder.completed && (
                  <button
                    onClick={() => onComplete(reminder.id)}
                    className="text-green-400 hover:text-green-300 transition-colors"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button
                  onClick={() => onEdit(reminder.id)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => onDelete(reminder.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredReminders.length === 0 && (
        <div className="text-center py-12 bg-[#0b141a] rounded-lg">
          <Bell className="text-gray-600 mx-auto mb-4" size={48} />
          <p className="text-gray-400">No reminders found</p>
        </div>
      )}
    </div>
  );
};

// Reminder Notification Component
export const ReminderNotification = ({ reminder, onDismiss, onSnooze }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[#00a884]/20 border-l-4 border-[#00a884] p-4 rounded-r-lg mb-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium mb-1">Reminder</p>
          <p className="text-gray-300 text-sm mb-2">{reminder.message}</p>
          {reminder.note && (
            <p className="text-gray-400 text-xs mb-2">{reminder.note}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="bg-[#00a884] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#008f72] transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={onSnooze}
              className="bg-[#0b141a] text-white px-3 py-1 rounded text-xs font-medium hover:bg-[#1a2e35] transition-colors"
            >
              Snooze 5m
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Reminder Settings Component
export const ReminderSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Bell size={18} className="text-[#00a884]" />
            Reminders
          </p>
          <p className="text-gray-400 text-sm">Set reminders for messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, remindersEnabled: !settings.remindersEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.remindersEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.remindersEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.remindersEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Sound</p>
              <p className="text-gray-400 text-xs">Play sound for reminders</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reminderSound: !settings.reminderSound })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reminderSound ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reminderSound ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Vibration</p>
              <p className="text-gray-400 text-xs">Vibrate for reminders</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, reminderVibration: !settings.reminderVibration })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.reminderVibration ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.reminderVibration ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default snooze time</p>
            <select
              value={settings.defaultSnooze || '5'}
              onChange={(e) => onUpdate({ ...settings, defaultSnooze: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
