import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, X, Edit, Trash2, Share2, Bell, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EventManager = ({ events, onCreateEvent, onUpdateEvent, onDeleteEvent, onRSVP, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxAttendees: '',
    isPublic: false
  });

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;

    const event = {
      id: Date.now(),
      ...newEvent,
      createdAt: new Date().toISOString(),
      attendees: [],
      rsvpStatus: 'going'
    };

    onCreateEvent(event);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      maxAttendees: '',
      isPublic: false
    });
    setShowCreateModal(false);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      maxAttendees: event.maxAttendees,
      isPublic: event.isPublic
    });
    setShowCreateModal(true);
  };

  const handleUpdateEvent = () => {
    const updatedEvent = {
      ...editingEvent,
      ...newEvent
    };

    onUpdateEvent(updatedEvent);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      maxAttendees: '',
      isPublic: false
    });
    setShowCreateModal(false);
  };

  const handleRSVP = (eventId, status) => {
    onRSVP(eventId, status);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Calendar size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Events</h2>
              <p className="text-gray-400 text-sm">{events.length} events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {events.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start gap-3">
                  {/* Date Badge */}
                  <div className="bg-[#00a884]/20 rounded-lg p-3 text-center min-w-[60px]">
                    <p className="text-[#00a884] text-xs font-medium uppercase">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {new Date(event.date).getDate()}
                    </p>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-semibold">{event.title}</h3>
                        {event.description && (
                          <p className="text-gray-400 text-sm mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(event.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{formatTime(event.time)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span>{event.attendees?.length || 0} attending</span>
                        {event.maxAttendees && (
                          <span>• {event.maxAttendees} max</span>
                        )}
                      </div>
                    </div>

                    {/* RSVP Buttons */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleRSVP(event.id, 'going')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          event.rsvpStatus === 'going'
                            ? 'bg-[#00a884] text-white'
                            : 'bg-[#0b141a] text-gray-400 hover:text-white'
                        }`}
                      >
                        Going
                      </button>
                      <button
                        onClick={() => handleRSVP(event.id, 'maybe')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          event.rsvpStatus === 'maybe'
                            ? 'bg-yellow-500 text-white'
                            : 'bg-[#0b141a] text-gray-400 hover:text-white'
                        }`}
                      >
                        Maybe
                      </button>
                      <button
                        onClick={() => handleRSVP(event.id, 'not-going')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          event.rsvpStatus === 'not-going'
                            ? 'bg-red-500 text-white'
                            : 'bg-[#0b141a] text-gray-400 hover:text-white'
                        }`}
                      >
                        Not Going
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No events scheduled</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingEvent(null);
              setNewEvent({
                title: '',
                description: '',
                date: '',
                time: '',
                location: '',
                maxAttendees: '',
                isPublic: false
              });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Create Event
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">
                  {editingEvent ? 'Edit Event' : 'Create Event'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEvent(null);
                    setNewEvent({
                      title: '',
                      description: '',
                      date: '',
                      time: '',
                      location: '',
                      maxAttendees: '',
                      isPublic: false
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description"
                    rows={3}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Date *</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Time *</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Event location"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Max Attendees</label>
                  <input
                    type="number"
                    value={newEvent.maxAttendees}
                    onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">Public Event</p>
                    <p className="text-gray-400 text-xs">Allow anyone to join</p>
                  </div>
                  <button
                    onClick={() => setNewEvent({ ...newEvent, isPublic: !newEvent.isPublic })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      newEvent.isPublic ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-all ${
                        newEvent.isPublic ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                  disabled={!newEvent.title || !newEvent.date || !newEvent.time}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Event Card Component
export const EventCard = ({ event, onClick, onRSVP }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 cursor-pointer hover:border-[#00a884] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="bg-[#00a884]/20 rounded-lg p-2 text-center min-w-[50px]">
          <p className="text-[#00a884] text-xs font-medium uppercase">
            {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-white text-xl font-bold">
            {new Date(event.date).getDate()}
          </p>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">{event.title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            <span>{event.time}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <MapPin size={14} />
              <span>{event.location}</span>
            </div>
          )}
        </div>
        <ChevronRight className="text-gray-400" size={20} />
      </div>
    </motion.div>
  );
};

// Event Settings Component
export const EventSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Calendar size={18} className="text-[#00a884]" />
            Events
          </p>
          <p className="text-gray-400 text-sm">Create and manage events</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, eventsEnabled: !settings.eventsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.eventsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.eventsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.eventsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Event reminders</p>
              <p className="text-gray-400 text-xs">Get notified before events</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, eventReminders: !settings.eventReminders })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.eventReminders ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.eventReminders ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Reminder time</p>
            <select
              value={settings.eventReminderTime || '1hour'}
              onChange={(e) => onUpdate({ ...settings, eventReminderTime: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="15min">15 minutes before</option>
              <option value="30min">30 minutes before</option>
              <option value="1hour">1 hour before</option>
              <option value="1day">1 day before</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-add to calendar</p>
              <p className="text-gray-400 text-xs">Add events to device calendar</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoAddToCalendar: !settings.autoAddToCalendar })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoAddToCalendar ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoAddToCalendar ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Event Reminder Component
export const EventReminder = ({ event, onDismiss, onSnooze }) => {
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
          <p className="text-white font-medium mb-1">Event Reminder</p>
          <p className="text-gray-300 text-sm mb-2">{event.title}</p>
          <p className="text-gray-400 text-xs">
            {new Date(event.date).toLocaleDateString()} at {event.time}
          </p>
          {event.location && (
            <p className="text-gray-400 text-xs flex items-center gap-1 mt-1">
              <MapPin size={12} />
              {event.location}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
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
    </motion.div>
  );
};

export default EventManager;
