import React, { useState } from 'react';
import { Tag, X, Check, RefreshCw, Plus, Edit2, Trash2, Search, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageLabels = ({ labels, onLabelMessage, onCreateLabel, onUpdateLabel, onDeleteLabel, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabel, setNewLabel] = useState({
    name: '',
    color: '#00a884'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState([]);

  const labelColors = ['#00a884', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894', '#e17055', '#74b9ff'];

  const filteredLabels = labels.filter(label =>
    label.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateLabel = async () => {
    if (!newLabel.name) return;

    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsCreating(false);

    const label = {
      id: Date.now(),
      ...newLabel,
      messageCount: 0,
      createdAt: new Date().toISOString()
    };

    onCreateLabel?.(label);
    setNewLabel({ name: '', color: '#00a884' });
    setShowCreateModal(false);
  };

  const handleEditLabel = (label) => {
    setEditingLabel(label);
    setNewLabel({
      name: label.name,
      color: label.color
    });
    setShowCreateModal(true);
  };

  const handleUpdateLabel = async () => {
    setIsCreating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsCreating(false);

    const updatedLabel = {
      ...editingLabel,
      ...newLabel
    };

    onUpdateLabel?.(updatedLabel);
    setEditingLabel(null);
    setNewLabel({ name: '', color: '#00a884' });
    setShowCreateModal(false);
  };

  const handleDeleteLabel = (labelId) => {
    if (confirm('Are you sure you want to delete this label?')) {
      onDeleteLabel?.(labelId);
    }
  };

  const toggleLabel = (labelId) => {
    setSelectedLabels(prev =>
      prev.includes(labelId)
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Tag size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Message Labels</h2>
              <p className="text-gray-400 text-sm">{labels.length} labels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#00a884]/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Labels Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredLabels.map(label => (
              <motion.button
                key={label._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => toggleLabel(label._id)}
                className={`p-4 rounded-lg border-2 transition-all relative group ${
                  selectedLabels.includes(label._id)
                    ? 'border-current'
                    : 'border-[#00a884]/20 hover:border-[#00a884]/50'
                }`}
                style={{
                  backgroundColor: `${label.color}20`,
                  borderColor: selectedLabels.includes(label._id) ? label.color : undefined,
                  color: label.color
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Tag size={16} />
                  {selectedLabels.includes(label._id) && <Check size={16} />}
                </div>
                <p className="font-medium text-sm">{label.name}</p>
                <p className="text-xs opacity-70">{label.messageCount || 0} messages</p>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLabel(label);
                    }}
                    className="p-1 bg-[#0b141a] rounded hover:bg-[#1a2e35]"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLabel(label._id);
                    }}
                    className="p-1 bg-[#0b141a] rounded hover:bg-red-500/20 text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.button>
            ))}
          </div>

          {filteredLabels.length === 0 && (
            <div className="text-center py-12">
              <Tag className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No labels found</p>
            </div>
          )}
        </div>

        {/* Selected Labels */}
        {selectedLabels.length > 0 && (
          <div className="p-4 border-t border-[#00a884]/20 bg-[#00a884]/10">
            <p className="text-white text-sm mb-2">{selectedLabels.length} labels selected</p>
            <button
              onClick={() => {
                onLabelMessage?.(selectedLabels);
                setSelectedLabels([]);
              }}
              className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors flex items-center justify-center gap-2"
            >
              <Tag size={18} />
              Apply Labels
            </button>
          </div>
        )}

        {/* Add Button */}
        <div className="p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              setEditingLabel(null);
              setNewLabel({ name: '', color: '#00a884' });
              setShowCreateModal(true);
            }}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Create Label
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">
                  {editingLabel ? 'Edit Label' : 'Create Label'}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Label name</p>
                  <input
                    type="text"
                    placeholder="Important"
                    value={newLabel.name}
                    onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {labelColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewLabel({ ...newLabel, color })}
                        className={`w-8 h-8 rounded-full transition-all ${
                          newLabel.color === color ? 'ring-2 ring-white ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                disabled={isCreating || !newLabel.name}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    {editingLabel ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editingLabel ? 'Update Label' : 'Create Label'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Message Label Settings Component
export const MessageLabelSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Tag size={18} className="text-[#00a884]" />
            Message Labels
          </p>
          <p className="text-gray-400 text-sm">Organize messages with labels</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, messageLabelsEnabled: !settings.messageLabelsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.messageLabelsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.messageLabelsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.messageLabelsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show label indicators</p>
              <p className="text-gray-400 text-xs">Display label badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showLabelIndicators: !settings.showLabelIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showLabelIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showLabelIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Filter by labels</p>
              <p className="text-gray-400 text-xs">Enable label filtering</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, enableLabelFilter: !settings.enableLabelFilter })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.enableLabelFilter ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.enableLabelFilter ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Label Button Component
export const LabelButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Message labels"
    >
      <Tag size={18} />
    </button>
  );
};

// Label Badge Component
export const LabelBadge = ({ label, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ backgroundColor: `${label.color}20`, color: label.color }}
    >
      <Tag size={10} />
      <span>{label.name}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(label._id)}
          className="hover:opacity-70"
        >
          <X size={10} />
        </button>
      )}
    </motion.div>
  );
};

// Message Labels Display Component
export const MessageLabelsDisplay = ({ labels, onLabelClick }) => {
  if (!labels || labels.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap mt-2">
      {labels.map(label => (
        <LabelBadge key={label._id} label={label} onClick={() => onLabelClick?.(label)} />
      ))}
    </div>
  );
};

// Label Filter Component
export const LabelFilter = ({ labels, selectedLabels, onToggleLabel }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {labels.map(label => (
        <button
          key={label._id}
          onClick={() => onToggleLabel?.(label._id)}
          className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
            selectedLabels.includes(label._id)
              ? 'border-2'
              : 'border border-[#00a884]/20 hover:border-[#00a884]/50'
          }`}
          style={{
            backgroundColor: `${label.color}20`,
            borderColor: selectedLabels.includes(label._id) ? label.color : undefined,
            color: label.color
          }}
        >
          <Tag size={12} />
          <span>{label.name}</span>
          {selectedLabels.includes(label._id) && <Check size={12} />}
        </button>
      ))}
    </div>
  );
};

export default MessageLabels;
