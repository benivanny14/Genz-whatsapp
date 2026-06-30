import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Search, Filter, BarChart3, Calendar, MessageSquare, RefreshCw, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BroadcastCard from '../components/BroadcastCard';
import BroadcastModal from '../components/BroadcastModal';
import broadcastService from '../services/broadcastService';

const Broadcasts = () => {
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await broadcastService.getBroadcasts();
      // Backend returns Mongo documents with `_id`, not `id`. Normalize here
      // so every consumer (BroadcastCard, React keys, delete/send calls)
      // gets a valid id instead of `undefined`.
      const normalized = (data.broadcasts || []).map(b => ({ ...b, id: b.id || b._id }));
      setBroadcasts(normalized);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      setError('Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastCreated = () => {
    setShowCreateModal(false);
    setSuccess('Broadcast created successfully');
    setTimeout(() => setSuccess(''), 3000);
    fetchBroadcasts();
  };

  const handleBroadcastUpdate = () => {
    fetchBroadcasts();
  };

  const handleBroadcastDelete = () => {
    fetchBroadcasts();
  };

  const handleSendMessage = () => {
    fetchBroadcasts();
  };

  const filteredBroadcasts = broadcasts.filter(broadcast =>
    (broadcast?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (broadcast?.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRecipients = broadcasts.reduce((sum, broadcast) => sum + (broadcast.recipientCount || 0), 0);
  const totalMessages = broadcasts.reduce((sum, broadcast) => sum + (broadcast.messageCount || 0), 0);
  const activeBroadcasts = broadcasts.filter(b => b.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Broadcast Lists</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchBroadcasts}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Lists</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{broadcasts.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalRecipients}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Messages Sent</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalMessages}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <BarChart3 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Lists</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{activeBroadcasts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search broadcasts..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
              <button className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date Range</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
            >
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-3 text-gray-500 dark:text-gray-400">Loading broadcasts...</span>
          </div>
        )}

        {/* Broadcasts List */}
        {!loading && (
          <div className="space-y-4">
            {filteredBroadcasts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No broadcasts found' : 'No broadcasts yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Create your first broadcast list to start sending messages to multiple contacts'
                  }
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Create First Broadcast
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {filteredBroadcasts.map((broadcast) => (
                  <BroadcastCard
                    key={broadcast.id}
                    broadcast={broadcast}
                    onBroadcastUpdate={handleBroadcastUpdate}
                    onBroadcastDelete={handleBroadcastDelete}
                    onSendMessage={handleSendMessage}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* Create Broadcast Modal (shared with the sidebar "New Broadcast" flow,
          includes real recipient selection so creation never fails with
          "Recipients are required") */}
      {showCreateModal && (
        <BroadcastModal onClose={() => setShowCreateModal(false)} onCreated={handleBroadcastCreated} />
      )}
    </div>
  );
};

export default Broadcasts;
