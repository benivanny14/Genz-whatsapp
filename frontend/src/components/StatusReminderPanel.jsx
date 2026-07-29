import React, { useState, useEffect } from 'react';
import { X, Bell, Clock, Calendar, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const StatusReminderPanel = ({ onClose, status, onReminderSet }) => {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    time: '',
    date: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [status]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/reminder`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.reminder) {
        setReminders([data.reminder]);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      // Fallback to localStorage
      try {
        const allReminders = JSON.parse(localStorage.getItem('genz_status_reminders') || '{}');
        const statusId = status?._id || status?.id;
        if (statusId && allReminders[statusId]) {
          setReminders(allReminders[statusId]);
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!newReminder.time || !newReminder.date) {
      alert('Please set both date and time');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/status-advanced/${status?._id || status?.id}/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reminderTime: `${newReminder.date}T${newReminder.time}`,
          reminderNote: newReminder.message || 'View this status'
        })
      });

      const data = await response.json();
      if (data.success) {
        const reminder = {
          id: Date.now(),
          time: newReminder.time,
          date: newReminder.date,
          message: newReminder.message || 'View this status',
          createdAt: new Date().toISOString()
        };
        const updated = [...reminders, reminder];
        setReminders(updated);
        setNewReminder({ time: '', date: '', message: '' });
        
        if (onReminderSet) {
          onReminderSet(reminder);
        }
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      alert('Failed to add reminder. Please try again.');
    }
  };

  const handleDeleteReminder = (reminderId) => {
    const updated = reminders.filter(r => r.id !== reminderId);
    setReminders(updated);
    saveReminders(updated);
  };

  const saveReminders = (reminderList) => {
    try {
      const allReminders = JSON.parse(localStorage.getItem('genz_status_reminders') || '{}');
      const statusId = status?._id || status?.id;
      if (statusId) {
        allReminders[statusId] = reminderList;
        localStorage.setItem('genz_status_reminders', JSON.stringify(allReminders));
      }
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const getReminderStatus = (reminder) => {
    const now = new Date();
    const reminderTime = new Date(`${reminder.date}T${reminder.time}`);
    return reminderTime <= now ? 'expired' : 'active';
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Bell className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Reminders</h2>
              <p className="text-white/60 text-xs">Set reminders for this status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add New Reminder */}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-white font-medium mb-3">Add Reminder</p>
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Date</label>
                <input
                  type="date"
                  value={newReminder.date}
                  onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Time</label>
                <input
                  type="time"
                  value={newReminder.time}
                  onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Message (Optional)</label>
                <input
                  type="text"
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                  placeholder="Reminder message..."
                  className="w-full bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddReminder}
                className="w-full px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Reminder
              </button>
            </div>
          </div>

          {/* Existing Reminders */}
          <div>
            <p className="text-white font-medium mb-3">Your Reminders ({reminders.length})</p>
            {reminders.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reminders set</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => {
                  const status = getReminderStatus(reminder);
                  return (
                    <div
                      key={reminder.id}
                      className={`bg-white/5 rounded-lg p-3 border ${
                        status === 'expired' ? 'border-red-500/30' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {status === 'expired' ? (
                              <AlertCircle className="text-red-400" size={16} />
                            ) : (
                              <Clock className="text-[#00a884]" size={16} />
                            )}
                            <span className="text-white text-sm font-medium">{reminder.message}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <Calendar size={12} />
                            <span>{reminder.date}</span>
                            <Clock size={12} />
                            <span>{reminder.time}</span>
                          </div>
                          {status === 'expired' && (
                            <p className="text-red-400 text-xs mt-1">Expired</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusReminderPanel;
