import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageSquare, 
  Type, 
  Palette, 
  Check, 
  RefreshCw, 
  Settings,
  Layers
} from 'lucide-react';

const BubbleStylesPanel = ({ onClose }) => {
  const [bubbleStyle, setBubbleStyle] = useState('rounded');
  const [bubbleColor, setBubbleColor] = useState('#00a884');
  const [bubbleOpacity, setBubbleOpacity] = useState(100);
  const [fontFamily, setFontFamily] = useState('default');
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showSenderName, setShowSenderName] = useState(true);
  const [bubbleBorder, setBubbleBorder] = useState(false);
  const [bubbleShadow, setBubbleShadow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('genz_bubble_styles');
      if (saved) {
        const settings = JSON.parse(saved);
        setBubbleStyle(settings.bubbleStyle || 'rounded');
        setBubbleColor(settings.bubbleColor || '#00a884');
        setBubbleOpacity(settings.bubbleOpacity || 100);
        setFontFamily(settings.fontFamily || 'default');
        setFontSize(settings.fontSize || 16);
        setFontColor(settings.fontColor || '#ffffff');
        setShowTimestamp(settings.showTimestamp !== false);
        setShowSenderName(settings.showSenderName !== false);
        setBubbleBorder(settings.bubbleBorder || false);
        setBubbleShadow(settings.bubbleShadow || false);
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
        bubbleStyle,
        bubbleColor,
        bubbleOpacity,
        fontFamily,
        fontSize,
        fontColor,
        showTimestamp,
        showSenderName,
        bubbleBorder,
        bubbleShadow
      };
      localStorage.setItem('genz_bubble_styles', JSON.stringify(settings));
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const bubbleStyles = [
    { id: 'rounded', label: 'Rounded', preview: 'rounded-lg' },
    { id: 'square', label: 'Square', preview: 'rounded-none' },
    { id: 'bubble', label: 'Bubble', preview: 'rounded-3xl' },
    { id: 'sharp', label: 'Sharp', preview: 'rounded-sm' },
    { id: 'pill', label: 'Pill', preview: 'rounded-full' }
  ];

  const fontFamilies = [
    { id: 'default', label: 'Default', value: 'sans-serif' },
    { id: 'modern', label: 'Modern', value: 'Inter, sans-serif' },
    { id: 'classic', label: 'Classic', value: 'Georgia, serif' },
    { id: 'mono', label: 'Mono', value: 'monospace' },
    { id: 'handwriting', label: 'Handwriting', value: 'cursive' }
  ];

  const bubbleColors = [
    '#00a884', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
    '#22c55e', '#06b6d4', '#6366f1', '#f43f5e', '#84cc16'
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
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Bubble Styles & Fonts</h2>
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

          {/* Bubble Style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-600" />
              <h4 className="font-medium text-gray-700">Bubble Shape</h4>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {bubbleStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setBubbleStyle(style.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    bubbleStyle === style.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 bg-gray-50 hover:border-pink-300'
                  }`}
                >
                  <div className={`w-8 h-8 bg-pink-200 mx-auto ${style.preview}`} />
                  <p className="text-xs text-gray-600 mt-1 text-center">{style.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bubble Color */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-600" />
              <h4 className="font-medium text-gray-700">Bubble Color</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {bubbleColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setBubbleColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    bubbleColor === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Bubble Opacity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-pink-600" />
                <h4 className="font-medium text-gray-700">Bubble Opacity</h4>
              </div>
              <span className="text-sm text-gray-500">{bubbleOpacity}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={bubbleOpacity}
              onChange={(e) => setBubbleOpacity(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-pink-600" />
              <h4 className="font-medium text-gray-700">Font Family</h4>
            </div>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {fontFamilies.map((font) => (
                <option key={font.id} value={font.id}>{font.label}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-pink-600" />
                <h4 className="font-medium text-gray-700">Font Size</h4>
              </div>
              <span className="text-sm text-gray-500">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Font Color */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-600" />
              <h4 className="font-medium text-gray-700">Font Color</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {bubbleColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setFontColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    fontColor === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Display Options</h4>
            
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show timestamp</p>
                <p className="text-xs text-gray-500">Display message time</p>
              </div>
              <input
                type="checkbox"
                checked={showTimestamp}
                onChange={(e) => setShowTimestamp(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Show sender name</p>
                <p className="text-xs text-gray-500">Display sender in group chats</p>
              </div>
              <input
                type="checkbox"
                checked={showSenderName}
                onChange={(e) => setShowSenderName(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Bubble border</p>
                <p className="text-xs text-gray-500">Add border to message bubbles</p>
              </div>
              <input
                type="checkbox"
                checked={bubbleBorder}
                onChange={(e) => setBubbleBorder(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <div>
                <p className="text-sm text-gray-800">Bubble shadow</p>
                <p className="text-xs text-gray-500">Add shadow to message bubbles</p>
              </div>
              <input
                type="checkbox"
                checked={bubbleShadow}
                onChange={(e) => setBubbleShadow(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
            </label>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Preview</h4>
            <div className="p-4 bg-gray-100 rounded-lg">
              <div className={`p-3 max-w-xs ${bubbleStyle === 'rounded' ? 'rounded-lg' : bubbleStyle === 'square' ? 'rounded-none' : bubbleStyle === 'bubble' ? 'rounded-3xl' : bubbleStyle === 'sharp' ? 'rounded-sm' : 'rounded-full'}`}
                style={{
                  backgroundColor: bubbleColor,
                  opacity: bubbleOpacity / 100,
                  fontFamily: fontFamilies.find(f => f.id === fontFamily)?.value,
                  fontSize: `${fontSize}px`,
                  color: fontColor,
                  border: bubbleBorder ? '2px solid rgba(0,0,0,0.1)' : 'none',
                  boxShadow: bubbleShadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <p className="font-medium">Hello! This is a preview message.</p>
                {showTimestamp && <p className="text-xs opacity-70 mt-1">12:30 PM</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BubbleStylesPanel;
