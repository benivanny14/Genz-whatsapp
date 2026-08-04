import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Search, 
  Settings,
  Smartphone,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PhoneContactsSync = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [matchedContacts, setMatchedContacts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load auto-sync setting from localStorage
  useEffect(() => {
    const savedAutoSync = localStorage.getItem('genz_auto_sync_contacts');
    if (savedAutoSync !== null) {
      setAutoSync(JSON.parse(savedAutoSync));
    }
    const savedLastSync = localStorage.getItem('genz_last_sync_contacts');
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }
  }, []);

  // Fetch matched contacts on mount
  useEffect(() => {
    fetchMatchedContacts();
  }, []);

  const fetchMatchedContacts = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/contacts/matched', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setMatchedContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching matched contacts:', error);
    }
  };

  const handleAutoSyncToggle = (enabled) => {
    setAutoSync(enabled);
    localStorage.setItem('genz_auto_sync_contacts', JSON.stringify(enabled));
  };

  const handleUploadContacts = async (contactsData) => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const token = getAuthToken();
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/contacts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contacts: contactsData })
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Successfully synced ${data.matchedCount} of ${data.totalContacts} contacts`);
        setMatchedContacts(prev => [...prev, ...data.matchedContacts.filter(c => c.matched)]);
        setLastSync(new Date());
        localStorage.setItem('genz_last_sync_contacts', new Date().toISOString());
        setShowUploadModal(false);
        await fetchMatchedContacts();
      } else {
        setError(data.message || 'Failed to sync contacts');
      }
    } catch (error) {
      setError('Error uploading contacts: ' + error.message);
    } finally {
      setSyncing(false);
      setUploadProgress(0);
    }
  };

  const handleAutoSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/contacts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contacts: [] }) // Will use stored contacts
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Auto-sync completed. ${data.newContactsCount} new contacts added.`);
        setLastSync(new Date());
        localStorage.setItem('genz_last_sync_contacts', new Date().toISOString());
        await fetchMatchedContacts();
      } else {
        setError(data.message || 'Auto-sync failed');
      }
    } catch (error) {
      setError('Error during auto-sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMatchedContacts(prev => prev.filter(c => c.userId?.toString() !== contactId));
        setSuccess('Contact removed successfully');
      } else {
        setError(data.message || 'Failed to remove contact');
      }
    } catch (error) {
      setError('Error removing contact: ' + error.message);
    }
  };

  const filteredContacts = matchedContacts.filter(contact => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.includes(query) ||
      contact.username?.toLowerCase().includes(query)
    );
  });

  const matchedCount = matchedContacts.length;
  const unmatchedCount = contacts.length - matchedCount;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Smartphone className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Phone Contacts</h3>
            <p className="text-sm text-gray-500">
              {matchedCount} contacts synced
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload</span>
          </button>
          <button
            onClick={handleAutoSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Sync</span>
          </button>
        </div>
      </div>

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Auto-sync contacts</span>
        </div>
        <button
          onClick={() => handleAutoSyncToggle(!autoSync)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            autoSync ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              autoSync ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      {/* Last sync info */}
      {lastSync && (
        <p className="text-xs text-gray-500 mb-4">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Error/Success messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No contacts synced yet</p>
            <p className="text-xs mt-1">Upload your phone contacts to get started</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.userId || contact.phone}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  {contact.profilePicture ? (
                    <img
                      src={contact.profilePicture}
                      alt={contact.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-green-600 font-semibold">
                      {contact.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {contact.isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
                <button
                  onClick={() => handleRemoveContact(contact.userId)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Upload Phone Contacts</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    This will match your phone contacts with users on GenZ WhatsApp.
                    Your contacts are encrypted and only used for matching.
                  </p>
                </div>

                {/* Demo upload - in real app, this would use Contacts API */}
                <button
                  onClick={() => {
                    // Simulate reading contacts from device
                    const demoContacts = [
                      { name: 'John Doe', phone: '+1234567890' },
                      { name: 'Jane Smith', phone: '+0987654321' },
                      { name: 'Bob Wilson', phone: '+1122334455' }
                    ];
                    handleUploadContacts(demoContacts);
                  }}
                  disabled={syncing}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Upload Contacts (Demo)'}
                </button>

                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                <button
                  onClick={() => setShowUploadModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhoneContactsSync;
