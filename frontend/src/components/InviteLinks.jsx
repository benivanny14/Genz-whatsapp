import React, { useState, useEffect } from 'react';
import { Link, Copy, Share2, RefreshCw, X, Check, Users, Clock, Shield, QrCode, Trash2, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InviteLinks = ({ chat, onGenerateLink, onRevokeLink, onShareLink, onClose }) => {
  const [inviteLink, setInviteLink] = useState(null);
  const [linkSettings, setLinkSettings] = useState({
    expiresIn: 'never', // never, 1day, 1week, custom
    maxJoins: 'unlimited', // unlimited, 10, 50, 100, custom
    requireApproval: false
  });
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Fetch existing invite link
    if (chat.inviteLink) {
      setInviteLink(chat.inviteLink);
    }
  }, [chat]);

  const handleGenerateLink = () => {
    const newLink = {
      url: `https://wa.me/${chat._id}?invite=${Date.now()}`,
      code: Date.now().toString(36).toUpperCase(),
      createdAt: Date.now(),
      expiresAt: linkSettings.expiresIn === 'never' ? null : Date.now() + getExpirationTime(linkSettings.expiresIn),
      maxJoins: linkSettings.maxJoins === 'unlimited' ? null : parseInt(linkSettings.maxJoins),
      currentJoins: 0,
      requireApproval: linkSettings.requireApproval
    };

    setInviteLink(newLink);
    
    if (onGenerateLink) {
      onGenerateLink(chat._id, newLink);
    }
  };

  const getExpirationTime = (expiresIn) => {
    switch (expiresIn) {
      case '1day': return 24 * 60 * 60 * 1000;
      case '1week': return 7 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${chat.name}`,
          text: `Join my group "${chat.name}" using this link: ${inviteLink.url}`,
          url: inviteLink.url
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const handleRevoke = () => {
    setInviteLink(null);
    if (onRevokeLink) {
      onRevokeLink(chat._id);
    }
  };

  const getExpirationText = () => {
    if (!inviteLink.expiresAt) return 'Never';
    
    const now = Date.now();
    const diff = inviteLink.expiresAt - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    return 'Soon';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-semibold flex items-center gap-2">
            <Link className="text-[#00a884]" />
            Invite Link
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {!inviteLink ? (
          // Generate Link View
          <div className="space-y-4">
            <div className="bg-[#0b141a] rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <Shield size={16} className="text-[#00a884] flex-shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm">
                  Generate an invite link to let people join this group directly.
                </p>
              </div>
            </div>

            <div>
              <p className="text-white text-sm font-medium mb-2">Link Settings</p>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Expires in</label>
                  <select
                    value={linkSettings.expiresIn}
                    onChange={(e) => setLinkSettings({ ...linkSettings, expiresIn: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  >
                    <option value="never">Never</option>
                    <option value="1day">1 day</option>
                    <option value="1week">1 week</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Maximum joins</label>
                  <select
                    value={linkSettings.maxJoins}
                    onChange={(e) => setLinkSettings({ ...linkSettings, maxJoins: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                  >
                    <option value="unlimited">Unlimited</option>
                    <option value="10">10 people</option>
                    <option value="50">50 people</option>
                    <option value="100">100 people</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">Require approval</p>
                    <p className="text-gray-400 text-xs">Admin must approve join requests</p>
                  </div>
                  <button
                    onClick={() => setLinkSettings({ ...linkSettings, requireApproval: !linkSettings.requireApproval })}
                    className={`w-12 h-6 rounded-full transition-all ${
                      linkSettings.requireApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-all ${
                        linkSettings.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateLink}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Link size={20} />
              Generate Link
            </button>
          </div>
        ) : (
          // Link Generated View
          <div className="space-y-4">
            <div className="bg-[#0b141a] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center">
                  <Link size={16} className="text-[#00a884]" />
                </div>
                <div>
                  <p className="text-white font-medium">Invite Link</p>
                  <p className="text-gray-400 text-xs">Code: {inviteLink.code}</p>
                </div>
              </div>

              <div className="bg-[#1a2e35] rounded-lg p-3 mb-3">
                <p className="text-[#00a884] text-sm break-all">{inviteLink.url}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-400">
                  <Users size={12} />
                  {inviteLink.currentJoins}/{inviteLink.maxJoins || '∞'} joined
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={12} />
                  Expires: {getExpirationText()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCopy}
                className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
              >
                {copied ? <Check size={20} className="text-[#00a884]" /> : <Copy size={20} />}
                <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleShare}
                className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
              >
                <Share2 size={20} />
                <span className="text-xs">Share</span>
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex flex-col items-center gap-1"
              >
                <Settings size={20} />
                <span className="text-xs">Settings</span>
              </button>
            </div>

            <button
              onClick={handleRevoke}
              className="w-full bg-red-500/20 text-red-400 py-3 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              Revoke Link
            </button>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#0b141a] rounded-lg p-4 space-y-3"
                >
                  <p className="text-white text-sm font-medium">Link Settings</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Reset link</p>
                      <p className="text-gray-400 text-xs">Generate new link code</p>
                    </div>
                    <button
                      onClick={handleGenerateLink}
                      className="text-[#00a884] hover:underline text-sm"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Require approval</p>
                      <p className="text-gray-400 text-xs">Admin must approve</p>
                    </div>
                    <button
                      onClick={() => setLinkSettings({ ...linkSettings, requireApproval: !linkSettings.requireApproval })}
                      className={`w-12 h-6 rounded-full transition-all ${
                        linkSettings.requireApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-all ${
                          linkSettings.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Invite Link List Component
export const InviteLinkList = ({ links, onRevoke, onRegenerate }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <Link size={20} className="text-[#00a884]" />
        Active Invite Links ({links.length})
      </h3>

      <div className="space-y-2">
        {links.map(link => (
          <motion.div
            key={link.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0b141a] rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{link.code}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    link.expiresAt && new Date(link.expiresAt) < new Date()
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-[#00a884]/20 text-[#00a884]'
                  }`}>
                    {link.expiresAt && new Date(link.expiresAt) < new Date() ? 'Expired' : 'Active'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs break-all">{link.url}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRegenerate(link.code)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => onRevoke(link.code)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Users size={12} />
                {link.currentJoins}/{link.maxJoins || '∞'}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}
              </div>
              <div className="flex items-center gap-1">
                <Shield size={12} />
                {link.requireApproval ? 'Approval' : 'Open'}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-8 bg-[#0b141a] rounded-lg">
          <Link className="text-gray-600 mx-auto mb-2" size={32} />
          <p className="text-gray-400 text-sm">No active invite links</p>
        </div>
      )}
    </div>
  );
};

// Invite Link Settings Component
export const InviteLinkSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Link size={18} className="text-[#00a884]" />
            Invite Links
          </p>
          <p className="text-gray-400 text-sm">Allow group invite links</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, inviteLinksEnabled: !settings.inviteLinksEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.inviteLinksEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.inviteLinksEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.inviteLinksEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Who can create links</p>
              <p className="text-gray-400 text-xs">Permission to generate links</p>
            </div>
            <select
              value={settings.whoCanCreateLinks || 'admins'}
              onChange={(e) => onUpdate({ ...settings, whoCanCreateLinks: e.target.value })}
              className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="admins">Admins only</option>
              <option value="all">All members</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require approval</p>
              <p className="text-gray-400 text-xs">Admin must approve joins</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, requireApproval: !settings.requireApproval })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.requireApproval ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.requireApproval ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Default expiration</p>
            <select
              value={settings.defaultExpiration || 'never'}
              onChange={(e) => onUpdate({ ...settings, defaultExpiration: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="never">Never</option>
              <option value="1day">1 day</option>
              <option value="1week">1 week</option>
              <option value="1month">1 month</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteLinks;
