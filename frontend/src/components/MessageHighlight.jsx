import React, { useState } from 'react';
import { Highlighter, X, Check, RefreshCw, Palette, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageHighlight = ({ message, onHighlight, onRemoveHighlight, onClose }) => {
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [isSaving, setIsSaving] = useState(false);

  const highlightColors = [
    { id: 'yellow', label: 'Yellow', color: 'bg-yellow-400' },
    { id: 'green', label: 'Green', color: 'bg-green-400' },
    { id: 'blue', label: 'Blue', color: 'bg-blue-400' },
    { id: 'pink', label: 'Pink', color: 'bg-pink-400' },
    { id: 'orange', label: 'Orange', color: 'bg-orange-400' },
    { id: 'purple', label: 'Purple', color: 'bg-purple-400' },
  ];

  const handleHighlight = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);

    if (onHighlight) {
      onHighlight({
        messageId: message._id,
        color: selectedColor,
        timestamp: new Date().toISOString()
      });
    }
    onClose();
  };

  const currentHighlight = message.highlight;

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
            <Highlighter className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Highlight Message</h3>
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
          <p className="text-gray-400 text-xs mb-2">Message to highlight:</p>
          <p className="text-white text-sm line-clamp-3">{message.content}</p>
        </div>

        {/* Current Highlight */}
        {currentHighlight && (
          <div className="bg-[#00a884]/10 border border-[#00a884]/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Highlighter className="text-[#00a884]" size={16} />
              <p className="text-[#00a884] text-sm">
                Currently highlighted in {currentHighlight.color}
              </p>
            </div>
          </div>
        )}

        {/* Color Selection */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Choose highlight color</p>
          <div className="grid grid-cols-3 gap-3">
            {highlightColors.map(color => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedColor === color.id
                    ? 'border-[#00a884] bg-[#00a884]/10'
                    : 'border-[#00a884]/20 bg-[#0b141a] hover:border-[#00a884]/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${color.color}`} />
                <span className="text-white text-xs">{color.label}</span>
                {selectedColor === color.id && <Check size={14} className="text-[#00a884]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {currentHighlight ? (
            <button
              onClick={() => {
                onRemoveHighlight?.(message._id);
                onClose();
              }}
              className="flex-1 bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <X size={18} />
              Remove Highlight
            </button>
          ) : (
            <button
              onClick={handleHighlight}
              disabled={isSaving}
              className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Highlighter size={18} />
                  Highlight
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Highlighted Message Component
export const HighlightedMessage = ({ message, children }) => {
  const colorMap = {
    yellow: 'bg-yellow-400/20 border-yellow-400',
    green: 'bg-green-400/20 border-green-400',
    blue: 'bg-blue-400/20 border-blue-400',
    pink: 'bg-pink-400/20 border-pink-400',
    orange: 'bg-orange-400/20 border-orange-400',
    purple: 'bg-purple-400/20 border-purple-400',
  };

  const highlightColor = message.highlight?.color || 'yellow';
  const colorClass = colorMap[highlightColor] || colorMap.yellow;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg p-2 border-l-4 ${colorClass}`}
    >
      {children}
    </motion.div>
  );
};

// Highlight Button Component
export const HighlightButton = ({ isHighlighted, onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className={`p-2 rounded-full transition-colors ${
        isHighlighted ? 'text-[#00a884]' : 'text-gray-400 hover:text-[#00a884]'
      }`}
      title={isHighlighted ? 'Edit highlight' : 'Highlight message'}
    >
      <Highlighter size={18} fill={isHighlighted ? 'currentColor' : 'none'} />
    </button>
  );
};

// Highlight Badge Component
export const HighlightBadge = ({ color }) => {
  const colorMap = {
    yellow: 'bg-yellow-400',
    green: 'bg-green-400',
    blue: 'bg-blue-400',
    pink: 'bg-pink-400',
    orange: 'bg-orange-400',
    purple: 'bg-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-black ${colorMap[color] || colorMap.yellow}`}
    >
      <Highlighter size={10} fill="currentColor" />
      <span className="capitalize">{color}</span>
    </motion.div>
  );
};

// Highlight Settings Component
export const HighlightSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Highlighter size={18} className="text-[#00a884]" />
            Message Highlights
          </p>
          <p className="text-gray-400 text-sm">Highlight important messages</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, highlightsEnabled: !settings.highlightsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.highlightsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.highlightsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.highlightsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show highlight indicators</p>
              <p className="text-gray-400 text-xs">Display highlight badges</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, showHighlightIndicators: !settings.showHighlightIndicators })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.showHighlightIndicators ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.showHighlightIndicators ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Highlights List Component
export const HighlightsList = ({ messages, onRemove, onJumpToMessage }) => {
  const highlightedMessages = messages.filter(m => m.highlight);

  return (
    <div className="space-y-2">
      {highlightedMessages.map(message => (
        <motion.div
          key={message._id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#00a884]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Highlighter size={16} className="text-[#00a884]" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm line-clamp-2 mb-1">{message.content}</p>
              <div className="flex items-center gap-2">
                <HighlightBadge color={message.highlight?.color} />
                <p className="text-gray-400 text-xs">
                  {new Date(message.highlight?.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onJumpToMessage?.(message._id)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Jump to message"
              >
                <Palette size={14} />
              </button>
              <button
                onClick={() => onRemove?.(message._id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Remove highlight"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      {highlightedMessages.length === 0 && (
        <div className="text-center py-8">
          <Highlighter className="text-gray-600 mx-auto mb-4" size={32} />
          <p className="text-gray-400">No highlighted messages</p>
        </div>
      )}
    </div>
  );
};

export default MessageHighlight;
