import React, { useState } from 'react';
import { X, Edit3, Share2, BarChart3, Star, Bookmark, Layout, Palette, Crown, Copy, Trash2 } from 'lucide-react';

const StatusManagementPanel = ({ onClose, status, onSave }) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [editedContent, setEditedContent] = useState(status?.content || '');
  const [highlightTitle, setHighlightTitle] = useState('');
  const [highlightCover, setHighlightCover] = useState(null);
  const [template, setTemplate] = useState('default');
  const [customColors, setCustomColors] = useState({ primary: '#00a884', secondary: '#075E54' });
  const [closeFriendsBadge, setCloseFriendsBadge] = useState(false);

  const tabs = [
    { id: 'edit', icon: Edit3, label: 'Edit' },
    { id: 'repost', icon: Share2, label: 'Repost' },
    { id: 'insights', icon: BarChart3, label: 'Insights' },
    { id: 'highlights', icon: Star, label: 'Highlights' },
    { id: 'template', icon: Layout, label: 'Template' }
  ];

  const templates = [
    { id: 'default', name: 'Default', preview: '🎨' },
    { id: 'gradient', name: 'Gradient', preview: '🌈' },
    { id: 'minimal', name: 'Minimal', preview: '⬜' },
    { id: 'bold', name: 'Bold', preview: '⬛' },
    { id: 'elegant', name: 'Elegant', preview: '✨' },
    { id: 'playful', name: 'Playful', preview: '🎭' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        editedContent,
        highlightTitle,
        highlightCover,
        template,
        customColors,
        closeFriendsBadge
      });
    }
  };

  const handleRepost = () => {
    console.log('Repost functionality - would share status to feed');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Bookmark className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Status Management</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00a884] text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'edit' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Edit3 size={18} className="text-[#00a884]" />
                  Edit Status
                </h3>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Edit your status content..."
                  className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-32 placeholder-white/40"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Actions</h3>
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2">
                    <Save size={18} />
                    Save Changes
                  </button>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 flex items-center justify-center gap-2">
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'repost' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Share2 size={18} className="text-[#00a884]" />
                  Repost Status
                </h3>
                <textarea
                  placeholder="Add a caption for your repost..."
                  className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40 mb-4"
                />
                <button
                  onClick={handleRepost}
                  className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Repost to Feed
                </button>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Share Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Share to My Story</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Share to Close Friends</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Share to Groups</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#00a884]" />
                  Status Insights
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Views</p>
                        <p className="text-white text-2xl font-bold">1,234</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Reactions</p>
                    <p className="text-white text-2xl font-bold">89</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Replies</p>
                    <p className="text-white text-2xl font-bold">45</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Shares</p>
                    <p className="text-white text-2xl font-bold">23</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Top Viewers</h3>
                <div className="space-y-2">
                  {['@user1', '@user2', '@user3'].map((viewer) => (
                    <div key={viewer} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <span className="text-white">{viewer}</span>
                      <span className="text-white/60 text-sm">Viewed 2h ago</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Star size={18} className="text-[#00a884]" />
                  Add to Highlights
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Highlight Title</p>
                    <input
                      type="text"
                      value={highlightTitle}
                      onChange={(e) => setHighlightTitle(e.target.value)}
                      placeholder="e.g., Summer 2024"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                    />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-2">Cover Image</p>
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-white/30 rounded-lg hover:border-white/60 cursor-pointer">
                      <Layout size={24} className="text-white/50" />
                      <span className="text-white/70">Upload Cover</span>
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                  <button className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium">
                    Add to Highlights
                  </button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Existing Highlights</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['Travel', 'Food', 'Memories'].map((highlight) => (
                    <button key={highlight} className="aspect-square bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">{highlight}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Layout size={18} className="text-[#00a884]" />
                  Template Customization
                </h3>
                
                <div className="mb-4">
                  <p className="text-white/70 text-sm mb-3">Select Template</p>
                  <div className="grid grid-cols-3 gap-3">
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        onClick={() => setTemplate(tmpl.id)}
                        className={`p-4 rounded-lg text-center transition-colors ${
                          template === tmpl.id
                            ? 'bg-[#00a884] text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        <span className="text-2xl">{tmpl.preview}</span>
                        <p className="text-xs mt-1">{tmpl.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-3">Custom Colors</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-white/50 text-xs mb-1">Primary</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customColors.primary}
                          onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.primary}
                          onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                          className="flex-1 bg-white/10 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-white/50 text-xs mb-1">Secondary</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customColors.secondary}
                          onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.secondary}
                          onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                          className="flex-1 bg-white/10 text-white px-3 py-2 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown size={18} className="text-[#00a884]" />
                    <div>
                      <p className="text-white font-medium">Close Friends Badge</p>
                      <p className="text-white/50 text-sm">Show badge on close friends status</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCloseFriendsBadge(!closeFriendsBadge)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      closeFriendsBadge ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        closeFriendsBadge ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusManagementPanel;
