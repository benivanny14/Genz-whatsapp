import React, { useState } from 'react';
import { Link as LinkIcon, Plus, X, ExternalLink, Copy, Trash2, Edit, Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileLinks = ({ links, onAddLink, onEditLink, onDeleteLink, onClose }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    description: ''
  });

  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) return;

    const link = {
      id: Date.now(),
      ...newLink,
      createdAt: new Date().toISOString()
    };

    onAddLink(link);
    setNewLink({ title: '', url: '', description: '' });
    setShowAddModal(false);
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setNewLink({
      title: link.title,
      url: link.url,
      description: link.description
    });
    setShowAddModal(true);
  };

  const handleUpdateLink = () => {
    if (!newLink.title || !newLink.url) return;

    const updatedLink = {
      ...editingLink,
      ...newLink
    };

    onEditLink(updatedLink);
    setEditingLink(null);
    setNewLink({ title: '', url: '', description: '' });
    setShowAddModal(false);
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <LinkIcon size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Profile Links</h2>
              <p className="text-gray-400 text-sm">{links.length} links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {links.map(link => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-[#00a884]" />
                    <span className="text-white font-medium">{link.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(link.url)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleEditLink(link)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteLink(link.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00a884] text-sm hover:underline flex items-center gap-1"
                >
                  {link.url}
                  <ExternalLink size={12} />
                </a>
                {link.description && (
                  <p className="text-gray-400 text-xs mt-2">{link.description}</p>
                )}
              </motion.div>
            ))}
          </div>

          {links.length === 0 && (
            <div className="text-center py-8">
              <LinkIcon className="text-gray-600 mx-auto mb-2" size={32} />
              <p className="text-gray-400 text-sm">No profile links yet</p>
            </div>
          )}
        </div>

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingLink(null);
              setNewLink({ title: '', url: '', description: '' });
              setShowAddModal(true);
            }}
            className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Link
          </button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-semibold">
                  {editingLink ? 'Edit Link' : 'Add Link'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLink(null);
                    setNewLink({ title: '', url: '', description: '' });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    placeholder="Website, Portfolio, etc."
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">URL</label>
                  <input
                    type="url"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Description (optional)</label>
                  <textarea
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    placeholder="Brief description"
                    rows={2}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={editingLink ? handleUpdateLink : handleAddLink}
                  disabled={!newLink.title || !newLink.url}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg font-medium hover:bg-[#008f72] transition-colors disabled:bg-[#0b141a] disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {editingLink ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Profile Links Settings Component
export const ProfileLinksSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <LinkIcon size={18} className="text-[#00a884]" />
            Profile Links
          </p>
          <p className="text-gray-400 text-sm">Add links to your profile</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, profileLinksEnabled: !settings.profileLinksEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.profileLinksEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.profileLinksEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.profileLinksEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show on profile</p>
              <p className="text-gray-400 text-xs">Display links publicly</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showLinksPublicly: !settings.showLinksPublicly })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showLinksPublicly ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showLinksPublicly ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <p className="text-white text-sm mb-2">Max links</p>
            <select
              value={settings.maxLinks || 5}
              onChange={(e) => onUpdate({ ...settings, maxLinks: parseInt(e.target.value) })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="3">3 links</option>
              <option value="5">5 links</option>
              <option value="10">10 links</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Profile Link Card Component
export const ProfileLinkCard = ({ link, onClick }) => {
  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="block bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884] transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-lg flex items-center justify-center">
          <Globe size={20} className="text-[#00a884]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{link.title}</p>
          <p className="text-gray-400 text-xs truncate">{link.url}</p>
        </div>
        <ExternalLink size={16} className="text-gray-400" />
      </div>
    </motion.a>
  );
};

// Profile Links Display Component
export const ProfileLinksDisplay = ({ links, onManage }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <LinkIcon size={18} className="text-[#00a884]" />
          Links
        </h3>
        <button
          onClick={onManage}
          className="text-[#00a884] hover:underline text-sm"
        >
          Manage
        </button>
      </div>

      <div className="space-y-2">
        {links.slice(0, 3).map(link => (
          <ProfileLinkCard key={link.id} link={link} />
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-4 bg-[#0b141a] rounded-lg">
          <LinkIcon className="text-gray-600 mx-auto mb-2" size={24} />
          <p className="text-gray-400 text-sm">No links added</p>
        </div>
      )}
    </div>
  );
};

export default ProfileLinks;
