import React, { useState, useEffect } from 'react';
import { X, Palette, Download, Star, Search, Sparkles, Check, Crown, Zap, Heart, Lock } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const ThemeStore = ({ onClose, onApplyTheme }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [installedThemes, setInstalledThemes] = useState([]);
  const { user } = useChat();
  const isPremium = user?.premium || false;

  const categories = [
    { id: 'all', label: 'All Themes' },
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'neon', label: 'Neon' },
    { id: 'nature', label: 'Nature' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'premium', label: 'Premium' }
  ];

  const themes = [
    {
      id: 'default-dark',
      name: 'Default Dark',
      category: 'dark',
      preview: '#0b141a',
      accent: '#00a884',
      isPremium: false,
      isInstalled: true,
      rating: 4.5,
      downloads: '1.2M'
    },
    {
      id: 'ocean-blue',
      name: 'Ocean Blue',
      category: 'gradient',
      preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      accent: '#667eea',
      isPremium: false,
      isInstalled: false,
      rating: 4.7,
      downloads: '890K'
    },
    {
      id: 'neon-glow',
      name: 'Neon Glow',
      category: 'neon',
      preview: '#1a1a2e',
      accent: '#ff00ff',
      isPremium: true,
      isInstalled: false,
      rating: 4.8,
      downloads: '650K'
    },
    {
      id: 'forest-green',
      name: 'Forest Green',
      category: 'nature',
      preview: '#1a2e1a',
      accent: '#4ade80',
      isPremium: false,
      isInstalled: false,
      rating: 4.6,
      downloads: '720K'
    },
    {
      id: 'sunset-orange',
      name: 'Sunset Orange',
      category: 'gradient',
      preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      accent: '#f5576c',
      isPremium: false,
      isInstalled: false,
      rating: 4.5,
      downloads: '580K'
    },
    {
      id: 'midnight-purple',
      name: 'Midnight Purple',
      category: 'dark',
      preview: '#1a0b2e',
      accent: '#a855f7',
      isPremium: true,
      isInstalled: false,
      rating: 4.9,
      downloads: '420K'
    },
    {
      id: 'crystal-white',
      name: 'Crystal White',
      category: 'light',
      preview: '#ffffff',
      accent: '#3b82f6',
      isPremium: false,
      isInstalled: false,
      rating: 4.4,
      downloads: '950K'
    },
    {
      id: 'cyber-punk',
      name: 'Cyber Punk',
      category: 'neon',
      preview: '#0d0d0d',
      accent: '#00ff00',
      isPremium: true,
      isInstalled: false,
      rating: 4.7,
      downloads: '380K'
    },
    {
      id: 'minimal-gray',
      name: 'Minimal Gray',
      category: 'minimal',
      preview: '#f3f4f6',
      accent: '#6b7280',
      isPremium: false,
      isInstalled: false,
      rating: 4.3,
      downloads: '620K'
    },
    {
      id: 'golden-hour',
      name: 'Golden Hour',
      category: 'gradient',
      preview: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      accent: '#f6d365',
      isPremium: true,
      isInstalled: false,
      rating: 4.8,
      downloads: '290K'
    },
    {
      id: 'arctic-frost',
      name: 'Arctic Frost',
      category: 'nature',
      preview: '#e0f7fa',
      accent: '#00bcd4',
      isPremium: false,
      isInstalled: false,
      rating: 4.5,
      downloads: '480K'
    },
    {
      id: 'royal-gold',
      name: 'Royal Gold',
      category: 'premium',
      preview: '#1a1a1a',
      accent: '#ffd700',
      isPremium: true,
      isInstalled: false,
      rating: 4.9,
      downloads: '180K'
    }
  ];

  useEffect(() => {
    // Load installed themes from localStorage
    const installed = JSON.parse(localStorage.getItem('genz_installed_themes') || '[]');
    setInstalledThemes(installed);
  }, []);

  const filteredThemes = themes.filter(theme => {
    const matchesCategory = activeCategory === 'all' || theme.category === activeCategory;
    const matchesSearch = theme.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInstallTheme = (theme) => {
    // Premium themes require an active subscription
    if (theme.isPremium && !isPremium) {
      return; // Premium gate — blocked silently, UI shows Lock icon
    }
    const newInstalled = [...installedThemes, theme.id];
    setInstalledThemes(newInstalled);
    localStorage.setItem('genz_installed_themes', JSON.stringify(newInstalled));
  };

  const handleApplyTheme = (theme) => {
    // Premium themes require an active subscription
    if (theme.isPremium && !isPremium) {
      return; // Premium gate
    }
    if (onApplyTheme) {
      onApplyTheme(theme);
    }
    onClose();
  };

  const isThemeInstalled = (themeId) => installedThemes.includes(themeId);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Palette className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Theme Store</h2>
              <p className="text-white/60 text-xs">Customize your app appearance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search themes..."
              className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredThemes.map((theme) => (
              <div
                key={theme.id}
                className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group"
              >
                {/* Theme Preview */}
                <div
                  className="aspect-square relative"
                  style={{ background: theme.preview }}
                >
                  {theme.isPremium && (
                    <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1.5">
                      <Crown size={14} className="text-white" />
                    </div>
                  )}
                  {isThemeInstalled(theme.id) && (
                    <div className="absolute top-2 left-2 bg-[#00a884] rounded-full p-1.5">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {theme.isPremium && !isPremium ? (
                      <div className="flex flex-col items-center gap-1">
                        <Lock size={20} className="text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-medium">Premium Only</span>
                      </div>
                    ) : !isThemeInstalled(theme.id) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstallTheme(theme);
                        }}
                        className="px-3 py-2 bg-[#00a884] rounded-lg text-white text-sm font-medium flex items-center gap-1"
                      >
                        <Download size={14} />
                        Install
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyTheme(theme);
                        }}
                        className="px-3 py-2 bg-[#00a884] rounded-lg text-white text-sm font-medium flex items-center gap-1"
                      >
                        <Sparkles size={14} />
                        Apply
                      </button>
                    )}
                  </div>
                </div>

                {/* Theme Info */}
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm truncate">{theme.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star size={12} fill="currentColor" />
                      <span>{theme.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/60 text-xs">
                      <Download size={12} />
                      <span>{theme.downloads}</span>
                    </div>
                  </div>
                  {theme.isPremium && (
                    <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                      <Crown size={12} />
                      <span>Premium</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <div className="flex items-center justify-between text-white/60 text-sm">
            <span>{filteredThemes.length} themes available</span>
            <span>{installedThemes.length} installed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeStore;
