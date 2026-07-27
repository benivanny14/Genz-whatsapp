import React, { useState } from 'react';
import { Palette, X, Check, Sun, Moon, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatTheme = ({ currentTheme, themes, onSelect, onCustomize, onClose }) => {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme?.id || 'default');

  const defaultThemes = [
    {
      id: 'default',
      name: 'Default',
      icon: Sparkles,
      colors: {
        primary: '#00a884',
        background: '#1a2e35',
        surface: '#0b141a',
        text: '#ffffff',
        textSecondary: '#9ca3af'
      }
    },
    {
      id: 'dark',
      name: 'Dark',
      icon: Moon,
      colors: {
        primary: '#00a884',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textSecondary: '#94a3b8'
      }
    },
    {
      id: 'light',
      name: 'Light',
      icon: Sun,
      colors: {
        primary: '#00a884',
        background: '#ffffff',
        surface: '#f3f4f6',
        text: '#111827',
        textSecondary: '#6b7280'
      }
    },
    {
      id: 'ocean',
      name: 'Ocean',
      icon: Sparkles,
      colors: {
        primary: '#3b82f6',
        background: '#1e3a8a',
        surface: '#1e40af',
        text: '#dbeafe',
        textSecondary: '#93c5fd'
      }
    },
    {
      id: 'forest',
      name: 'Forest',
      icon: Sparkles,
      colors: {
        primary: '#22c55e',
        background: '#14532d',
        surface: '#166534',
        text: '#dcfce7',
        textSecondary: '#86efac'
      }
    },
    {
      id: 'sunset',
      name: 'Sunset',
      icon: Sparkles,
      colors: {
        primary: '#f97316',
        background: '#7c2d12',
        surface: '#9a3412',
        text: '#fed7aa',
        textSecondary: '#fdba74'
      }
    },
    {
      id: 'purple',
      name: 'Purple',
      icon: Sparkles,
      colors: {
        primary: '#a855f7',
        background: '#581c87',
        surface: '#6b21a8',
        text: '#f3e8ff',
        textSecondary: '#d8b4fe'
      }
    },
    {
      id: 'rose',
      name: 'Rose',
      icon: Sparkles,
      colors: {
        primary: '#f43f5e',
        background: '#881337',
        surface: '#9f1239',
        text: '#ffe4e6',
        textSecondary: '#fda4af'
      }
    }
  ];

  const handleSelect = (themeId) => {
    setSelectedTheme(themeId);
    if (onSelect) {
      onSelect(themeId);
    }
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
              <Palette size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Chat Theme</h2>
              <p className="text-gray-400 text-sm">Customize your appearance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Theme Grid */}
          <div>
            <p className="text-white font-medium mb-3">Select Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {defaultThemes.map(theme => {
                const ThemeIcon = theme.icon;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`relative rounded-lg p-4 transition-all ${
                      selectedTheme === theme.id
                        ? 'ring-2 ring-[#00a884] ring-offset-2 ring-offset-[#1a2e35]'
                        : 'hover:ring-2 hover:ring-[#00a884]/50'
                    }`}
                    style={{
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.primary}33`
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <ThemeIcon size={20} style={{ color: theme.colors.primary }} />
                      <span className="text-white font-medium" style={{ color: theme.colors.text }}>
                        {theme.name}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.background }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.surface }}
                      />
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="absolute top-2 right-2 bg-[#00a884] rounded-full p-1">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Theme Button */}
          <button
            onClick={onCustomize}
            className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2 border border-[#00a884]/30"
          >
            <Palette size={18} />
            Create Custom Theme
          </button>

          {/* Preview */}
          <div>
            <p className="text-white font-medium mb-3">Preview</p>
            <div
              className="rounded-lg p-4 space-y-2"
              style={{
                backgroundColor: defaultThemes.find(t => t.id === selectedTheme)?.colors.background
              }}
            >
              <div
                className="rounded p-3"
                style={{
                  backgroundColor: defaultThemes.find(t => t.id === selectedTheme)?.colors.surface
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: defaultThemes.find(t => t.id === selectedTheme)?.colors.text }}
                >
                  Sample Message
                </p>
                <p
                  className="text-xs"
                  style={{ color: defaultThemes.find(t => t.id === selectedTheme)?.colors.textSecondary }}
                >
                  This is how your chat will look with the selected theme.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Theme Settings Component
export const ThemeSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Palette size={18} className="text-[#00a884]" />
            Chat Theme
          </p>
          <p className="text-gray-400 text-sm">Customize appearance</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, themeEnabled: !settings.themeEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.themeEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.themeEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.themeEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Theme mode</p>
            <select
              value={settings.themeMode || 'auto'}
              onChange={(e) => onUpdate({ ...settings, themeMode: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="auto">Auto (System)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Custom colors</p>
              <p className="text-gray-400 text-xs">Use custom color palette</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, customColors: !settings.customColors })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.customColors ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.customColors ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Animated themes</p>
              <p className="text-gray-400 text-xs">Enable theme animations</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, animatedThemes: !settings.animatedThemes })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.animatedThemes ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.animatedThemes ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Theme Toggle Component
export const ThemeToggle = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

// Theme Indicator Component
export const ThemeIndicator = ({ theme }) => {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-xs">
      {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
      <span className="capitalize">{theme} mode</span>
    </div>
  );
};

// Custom Theme Editor Component
export const CustomThemeEditor = ({ theme, onSave, onCancel }) => {
  const [colors, setColors] = useState({
    primary: theme?.colors?.primary || '#00a884',
    background: theme?.colors?.background || '#1a2e35',
    surface: theme?.colors?.surface || '#0b141a',
    text: theme?.colors?.text || '#ffffff',
    textSecondary: theme?.colors?.textSecondary || '#9ca3af'
  });

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
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
          <h3 className="text-white text-xl font-semibold">Custom Theme</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={colors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Background</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Surface</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colors.surface}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={colors.surface}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="flex-1 bg-[#0b141a] text-white px-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(colors)}
              className="flex-1 bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
            >
              Save Theme
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatTheme;
