import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Home, 
  Layout, 
  Grid, 
  List, 
  Check, 
  RefreshCw, 
  Settings,
  Smartphone,
  Image as ImageIcon,
  Palette
} from 'lucide-react';

const HomeScreenCustomizationPanel = ({ onClose }) => {
  const [layoutMode, setLayoutMode] = useState('grid');
  const [showStatusPreview, setShowStatusPreview] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showFAB, setShowFAB] = useState(true);
  const [customBackground, setCustomBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#1a2e35');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [headerStyle, setHeaderStyle] = useState('default');
  const [showOnlineIndicator, setShowOnlineIndicator] = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('genz_home_screen_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setLayoutMode(settings.layoutMode || 'grid');
        setShowStatusPreview(settings.showStatusPreview !== false);
        setShowQuickActions(settings.showQuickActions !== false);
        setShowFAB(settings.showFAB !== false);
        setCustomBackground(settings.customBackground || false);
        setBackgroundColor(settings.backgroundColor || '#1a2e35');
        setBackgroundImage(settings.backgroundImage || '');
        setHeaderStyle(settings.headerStyle || 'default');
        setShowOnlineIndicator(settings.showOnlineIndicator !== false);
        setShowTypingIndicator(settings.showTypingIndicator !== false);
        setCompactMode(settings.compactMode || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const settings = {
        layoutMode,
        showStatusPreview,
        showQuickActions,
        showFAB,
        customBackground,
        backgroundColor,
        backgroundImage,
        headerStyle,
        showOnlineIndicator,
        showTypingIndicator,
        compactMode
      };
      localStorage.setItem('genz_home_screen_settings', JSON.stringify(settings));
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const layoutModes = [
    { id: 'grid', label: 'Grid', icon: Grid },
    { id: 'list', label: 'List', icon: List },
    { id: 'hybrid', label: 'Hybrid', icon: Layout }
  ];

  const headerStyles = [
    { id: 'default', label: 'Default' },
    { id: 'transparent', label: 'Transparent' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'solid', label: 'Solid' }
  ];

  const backgroundColors = [
    '#1a2e35', '#0f172a', '#1e293b', '#0c4a6e', '#14532d',
    '#7c2d12', '#581c87', '#881337', '#18181b', '#fafafa'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <Home className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Home Screen Customization</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          {/* Layout Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-cyan-600" />
              <h4 className="font-medium text-gray-700">Layout Mode</h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {layoutModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setLayoutMode(mode.id)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      layoutMode === mode.id
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 bg-gray-50 hover:border-cyan-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${layoutMode === mode.id ? 'text-cyan-600' : 'text-gray-400'}`} />
                    <span className="text-xs text-gray-600">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Display Options</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show status preview</p>
                <p className="text-xs text-gray-500">Display status stories at top</p>
              </div>
              <input
                type="checkbox"
                checked={showStatusPreview}
                onChange={(e) => setShowStatusPreview(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show quick actions</p>
                <p className="text-xs text-gray-500">Display action buttons</p>
              </div>
              <input
                type="checkbox"
                checked={showQuickActions}
                onChange={(e) => setShowQuickActions(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show FAB button</p>
                <p className="text-xs text-gray-500">Floating action button for new chat</p>
              </div>
              <input
                type="checkbox"
                checked={showFAB}
                onChange={(e) => setShowFAB(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show online indicator</p>
                <p className="text-xs text-gray-500">Display online status</p>
              </div>
              <input
                type="checkbox"
                checked={showOnlineIndicator}
                onChange={(e) => setShowOnlineIndicator(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show typing indicator</p>
                <p className="text-xs text-gray-500">Display typing status</p>
              </div>
              <input
                type="checkbox"
                checked={showTypingIndicator}
                onChange={(e) => setShowTypingIndicator(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Compact mode</p>
                <p className="text-xs text-gray-500">Smaller chat list items</p>
              </div>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>
          </div>

          {/* Custom Background */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-600" />
              <h4 className="font-medium text-gray-700">Custom Background</h4>
            </div>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Enable custom background</p>
                <p className="text-xs text-gray-500">Use custom background image/color</p>
              </div>
              <input
                type="checkbox"
                checked={customBackground}
                onChange={(e) => setCustomBackground(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
            </label>

            {customBackground && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-800 mb-2 block">Background Color</label>
                  <div className="flex flex-wrap gap-2">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setBackgroundColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          backgroundColor === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-800 mb-2 block">Background Image URL</label>
                  <input
                    type="text"
                    value={backgroundImage}
                    onChange={(e) => setBackgroundImage(e.target.value)}
                    placeholder="Enter image URL"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Header Style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-600" />
              <h4 className="font-medium text-gray-700">Header Style</h4>
            </div>
            <select
              value={headerStyle}
              onChange={(e) => setHeaderStyle(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {headerStyles.map((style) => (
                <option key={style.id} value={style.id}>{style.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeScreenCustomizationPanel;
