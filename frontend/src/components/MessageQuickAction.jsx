import React, { useState } from 'react';
import { Zap, X, Check, RefreshCw, Plus, Trash2, Edit2, Search, Star, Archive, Reply, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageQuickAction = ({ message, actions, onCreateAction, onUpdateAction, onDeleteAction, onExecuteAction, onClose }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [newAction, setNewAction] = useState({
    name: '',
    icon: 'star',
    action: 'reply'
  });
  const [isExecuting, setIsExecuting] = useState(false);

  const actionIcons = [
    { id: 'star', icon: Star, label: 'Star' },
    { id: 'archive', icon: Archive, label: 'Archive' },
    { id: 'reply', icon: Reply, label: 'Reply' },
    { id: 'share', icon: Share2, label: 'Share' },
    { id: 'copy', icon: Copy, label: 'Copy' },
  ];

  const actionTypes = [
    { id: 'reply', label: 'Quick reply' },
    { id: 'forward', label: 'Forward message' },
    { id: 'copy', label: 'Copy text' },
    { id: 'star', label: 'Star message' },
    { id: 'archive', label: 'Archive chat' },
  ];

  const handleCreateAction = async () => {
    if (!newAction.name) return;

    const action = {
      id: Date.now(),
      ...newAction,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    onCreateAction?.(action);
    setNewAction({ name: '', icon: 'star', action: 'reply' });
    setShowCreateModal(false);
  };

  const handleEditAction = (action) => {
    setEditingAction(action);
    setNewAction({
      name: action.name,
      icon: action.icon,
      action: action.action
    });
    setShowCreateModal(true);
  };

  const handleUpdateAction = async () => {
    const updatedAction = {
      ...editingAction,
      ...newAction
    };

    onUpdateAction?.(updatedAction);
    setEditingAction(null);
    setNewAction({ name: '', icon: 'star', action: 'reply' });
    setShowCreateModal(false);
  };

  const handleDeleteAction = (actionId) => {
    onDeleteAction?.(actionId);
  };

  const handleExecuteAction = async (action) => {
    setIsExecuting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsExecuting(false);

    if (onExecuteAction) {
      onExecuteAction({
        actionId: action._id,
        messageId: message._id,
        actionType: action.action
      });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Quick Actions</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-xs mb-2">Selected message:</p>
          <p className="text-white text-sm line-clamp-2">{message.content}</p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {actions.map(action => {
            const IconComponent = actionIcons.find(i => i.id === action.icon)?.icon || Star;
            return (
              <button
                key={action._id}
                onClick={() => handleExecuteAction(action)}
                disabled={isExecuting}
                className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20 hover:border-[#00a884]/50 transition-colors text-center disabled:opacity-50"
              >
                <IconComponent size={24} className="text-[#00a884] mx-auto mb-2" />
                <p className="text-white text-sm">{action.name}</p>
              </button>
            );
          })}
        </div>

        {/* Add Custom Action */}
        <button
          onClick={() => {
            setEditingAction(null);
            setNewAction({ name: '', icon: 'star', action: 'reply' });
            setShowCreateModal(true);
          }}
          className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Plus size={18} />
          Add Custom Action
        </button>

        {/* Manage Actions */}
        <button
          onClick={() => {
            // In a full implementation, this would open a settings modal
            alert('Manage actions feature coming soon');
          }}
          className="w-full text-gray-400 py-2 rounded-lg hover:text-white transition-colors text-sm"
        >
          Manage Actions
        </button>
      </div>

      {/* Create/Edit Action Modal */}
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
                  {editingAction ? 'Edit Action' : 'Create Action'}
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
                  <p className="text-gray-400 text-sm mb-2">Action name</p>
                  <input
                    type="text"
                    value={newAction.name}
                    onChange={(e) => setNewAction({ ...newAction, name: e.target.value })}
                    placeholder="e.g., Quick reply"
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  />
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Icon</p>
                  <div className="grid grid-cols-5 gap-2">
                    {actionIcons.map(icon => {
                      const IconComponent = icon.icon;
                      return (
                        <button
                          key={icon.id}
                          onClick={() => setNewAction({ ...newAction, icon: icon.id })}
                          className={`p-2 rounded-lg border-2 transition-all ${
                            newAction.icon === icon.id
                              ? 'border-[#00a884] bg-[#00a884]/10'
                              : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                          }`}
                        >
                          <IconComponent size={16} className={newAction.icon === icon.id ? 'text-[#00a884]' : 'text-gray-400'} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-2">Action type</p>
                  <select
                    value={newAction.action}
                    onChange={(e) => setNewAction({ ...newAction, action: e.target.value })}
                    className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
                  >
                    {actionTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={editingAction ? handleUpdateAction : handleCreateAction}
                  disabled={!newAction.name}
                  className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingAction ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Quick Action Button Component
export const QuickActionButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Quick actions"
    >
      <Zap size={18} />
    </button>
  );
};

// Quick Action Menu Component
export const QuickActionMenu = ({ message, actions, onExecute }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
        title="Quick actions"
      >
        <Zap size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a2e35] rounded-lg border border-[#00a884]/20 shadow-xl z-50"
          >
            {actions.slice(0, 4).map(action => {
              const IconComponent = actionIcons.find(i => i.id === action.icon)?.icon || Star;
              return (
                <button
                  key={action._id}
                  onClick={() => {
                    onExecute?.(action);
                    setIsOpen(false);
                  }}
                  className="w-full p-3 text-left hover:bg-[#00a884]/10 transition-colors border-b border-[#00a884]/10 last:border-0 flex items-center gap-3"
                >
                  <IconComponent size={16} className="text-[#00a884]" />
                  <span className="text-white text-sm">{action.name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Quick Action Settings Component
export const QuickActionSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Zap size={18} className="text-[#00a884]" />
            Quick Actions
          </p>
          <p className="text-gray-400 text-sm">Fast message actions</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, quickActionsEnabled: !settings.quickActionsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.quickActionsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.quickActionsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.quickActionsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show on long press</p>
              <p className="text-gray-400 text-xs">Display on message hold</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, quickActionOnLongPress: !settings.quickActionOnLongPress })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.quickActionOnLongPress ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.quickActionOnLongPress ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show action badges</p>
              <p className="text-gray-400 text-xs">Display action icons</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showActionBadges: !settings.showActionBadges })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showActionBadges ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showActionBadges ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageQuickAction;
