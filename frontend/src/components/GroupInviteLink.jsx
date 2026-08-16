import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Check, 
  Share2, 
  X,
  Clock,
  Users,
  AlertCircle
} from 'lucide-react';

const GroupInviteLink = ({ groupId, onClose }) => {
  const [inviteLink, setInviteLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expiresIn, setExpiresIn] = useState('never');
  const [maxUses, setMaxUses] = useState('');

  useEffect(() => {
    fetchInviteLink();
  }, [groupId]);

  const fetchInviteLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await authFetch(`${resolveApiBase()}/groups/${groupId}/invite-link`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
      } else {
        setError(data.message || 'Failed to fetch invite link');
      }
    } catch (error) {
      setError('Error fetching invite link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const body = {};
      if (expiresIn !== 'never') {
        const hours = parseInt(expiresIn);
        body.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      if (maxUses) {
        body.maxUses = parseInt(maxUses);
      }

      const response = await authFetch(`${resolveApiBase()}/groups/${groupId}/invite-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
      } else {
        setError(data.message || 'Failed to generate invite link');
      }
    } catch (error) {
      setError('Error generating invite link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetInviteLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const body = {};
      if (expiresIn !== 'never') {
        const hours = parseInt(expiresIn);
        body.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      if (maxUses) {
        body.maxUses = parseInt(maxUses);
      }

      const response = await authFetch(`${resolveApiBase()}/groups/${groupId}/invite-link/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(data.inviteLink);
      } else {
        setError(data.message || 'Failed to reset invite link');
      }
    } catch (error) {
      setError('Error resetting invite link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeInviteLink = async () => {
    if (!confirm('Are you sure you want to revoke this invite link?')) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await authFetch(`${resolveApiBase()}/groups/${groupId}/invite-link`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(null);
      } else {
        setError(data.message || 'Failed to revoke invite link');
      }
    } catch (error) {
      setError('Error revoking invite link: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink?.url) {
      navigator.clipboard.writeText(inviteLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (inviteLink?.url && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my group on GenZ WhatsApp',
          url: inviteLink.url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Link className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Group Invite Link</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {!loading && !error && !inviteLink && (
            <div className="text-center py-8">
              <Link className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">No invite link generated yet</p>
              <button
                onClick={generateInviteLink}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Generate Invite Link
              </button>
            </div>
          )}

          {!loading && !error && inviteLink && (
            <div className="space-y-4">
              {/* Link Display */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title="Copy link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex-1 p-3 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-500 mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{inviteLink.uses || 0}</p>
                  <p className="text-xs text-blue-600">Uses</p>
                </div>
                {inviteLink.expiresAt && (
                  <div className="flex-1 p-3 bg-orange-50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-500 mb-1" />
                    <p className="text-xs text-orange-600">
                      Expires: {new Date(inviteLink.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                {navigator.share && (
                  <button
                    onClick={shareLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                )}
              </div>

              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm text-gray-700">Link Settings</span>
                <RefreshCw className={`w-4 h-4 text-gray-500 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>

              {/* Settings */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Link Expiration</label>
                      <select
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="never">Never</option>
                        <option value="1">1 hour</option>
                        <option value="24">24 hours</option>
                        <option value="168">1 week</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Max Uses (optional)</label>
                      <input
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="No limit"
                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button
                      onClick={resetInviteLink}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Reset Link with New Settings
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Revoke */}
              <button
                onClick={revokeInviteLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Revoke Link
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GroupInviteLink;
