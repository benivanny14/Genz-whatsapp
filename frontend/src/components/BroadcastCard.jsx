import React, { useState } from 'react';
import { Users, Send, Edit, Trash2, MoreVertical, Clock, CheckCircle, AlertCircle, Calendar, MessageSquare, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import broadcastService from '../services/broadcastService';

const BroadcastCard = ({ broadcast, onBroadcastUpdate, onBroadcastDelete, onSendMessage }) => {
  const [showActions, setShowActions] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState(broadcast.name || '');
  const [editDescription, setEditDescription] = useState(broadcast.description || '');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setSending(true);
      const messageData = {
        content: message,
        type: 'text'
      };
      
      await broadcastService.sendBroadcastMessage(broadcast.id, messageData);
      setMessage('');
      setShowMessageModal(false);
      onSendMessage && onSendMessage();
    } catch (error) {
      console.error('Error sending broadcast message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleEditOpen = () => {
    setEditName(broadcast.name || '');
    setEditDescription(broadcast.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    try {
      setSaving(true);
      await broadcastService.updateBroadcast(broadcast.id, {
        name: editName.trim(),
        description: editDescription.trim()
      });
      setShowEditModal(false);
      onBroadcastUpdate && onBroadcastUpdate();
    } catch (error) {
      console.error('Error updating broadcast:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${broadcast.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await broadcastService.deleteBroadcast(broadcast.id);
      onBroadcastDelete && onBroadcastDelete();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (broadcast.status === 'active') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (broadcast.status === 'scheduled') {
      return <Calendar className="w-4 h-4 text-blue-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (broadcast.status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400';
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{broadcast.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{broadcast.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>{broadcast.status}</span>
          </span>
          
          <div className={`flex items-center space-x-1 transition-opacity ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}>
            <button
              onClick={() => setShowMessageModal(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Send Message"
            >
              <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={handleEditOpen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit Broadcast"
            >
              <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
              title="Delete Broadcast"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-gray-400">Recipients</p>
            <p className="font-medium text-gray-900 dark:text-white">{broadcast.recipientCount || 0}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-gray-400">Messages</p>
            <p className="font-medium text-gray-900 dark:text-white">{broadcast.messageCount || 0}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-gray-400">Delivered</p>
            <p className="font-medium text-gray-900 dark:text-white">{broadcast.deliveredCount || 0}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-gray-500 dark:text-gray-400">Last Sent</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {broadcast.lastSent ? formatDate(broadcast.lastSent) : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {broadcast.tags && broadcast.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {broadcast.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Edit Broadcast Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit Broadcast
              </h2>

              <div className="mb-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Broadcast name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMessageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Send Message to {broadcast.name}
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  This message will be sent to {broadcast.recipientCount || 0} recipients
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your broadcast message..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !message.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BroadcastCard;
