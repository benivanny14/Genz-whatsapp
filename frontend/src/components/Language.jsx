import React, { useState } from 'react';
import { Globe, X, Check, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Language = ({ currentLanguage, languages, onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || 'en');

  const availableLanguages = [
    { id: 'en', name: 'English', nativeName: 'English' },
    { id: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { id: 'es', name: 'Spanish', nativeName: 'Español' },
    { id: 'fr', name: 'French', nativeName: 'Français' },
    { id: 'de', name: 'German', nativeName: 'Deutsch' },
    { id: 'it', name: 'Italian', nativeName: 'Italiano' },
    { id: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { id: 'ru', name: 'Russian', nativeName: 'Русский' },
    { id: 'zh', name: 'Chinese', nativeName: '中文' },
    { id: 'ja', name: 'Japanese', nativeName: '日本語' },
    { id: 'ko', name: 'Korean', nativeName: '한국어' },
    { id: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { id: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { id: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { id: 'pl', name: 'Polish', nativeName: 'Polski' },
    { id: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { id: 'th', name: 'Thai', nativeName: 'ไทย' },
    { id: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { id: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  ];

  const filteredLanguages = availableLanguages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (languageId) => {
    setSelectedLanguage(languageId);
    if (onSelect) {
      onSelect(languageId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
              <Globe size={20} className="text-[#00a884]" />
            </div>
            <div>
              <h2 className="text-white text-xl font-semibold">Language</h2>
              <p className="text-gray-400 text-sm">Select your language</p>
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full bg-[#0b141a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Language List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredLanguages.map(language => (
              <button
                key={language.id}
                onClick={() => handleSelect(language.id)}
                className={`w-full p-4 rounded-lg text-left transition-all flex items-center justify-between ${
                  selectedLanguage === language.id
                    ? 'bg-[#00a884]/20 border-2 border-[#00a884]'
                    : 'bg-[#0b141a] border-2 border-[#00a884]/30 hover:border-[#00a884]'
                }`}
              >
                <div>
                  <p className="text-white font-medium">{language.name}</p>
                  <p className="text-gray-400 text-sm">{language.nativeName}</p>
                </div>
                {selectedLanguage === language.id && <Check size={18} className="text-[#00a884]" />}
              </button>
            ))}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="text-center py-12">
              <Globe className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No languages found</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Language Settings Component
export const LanguageSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Globe size={18} className="text-[#00a884]" />
            Language
          </p>
          <p className="text-gray-400 text-sm">App language</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, languageEnabled: !settings.languageEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.languageEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.languageEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.languageEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Select language</p>
            <select
              value={settings.selectedLanguage || 'en'}
              onChange={(e) => onUpdate({ ...settings, selectedLanguage: e.target.value })}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="sw">Swahili (Kiswahili)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Auto-detect language</p>
              <p className="text-gray-400 text-xs">Use device language</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, autoDetectLanguage: !settings.autoDetectLanguage })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.autoDetectLanguage ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.autoDetectLanguage ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Language Button Component
export const LanguageButton = ({ onOpen, currentLanguage }) => {
  const languageNames = {
    en: 'English',
    sw: 'Swahili',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
  };

  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Language"
    >
      <Globe size={18} />
    </button>
  );
};

// Language Indicator Component
export const LanguageIndicator = ({ language }) => {
  const languageNames = {
    en: 'English',
    sw: 'Swahili',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
  };

  return (
    <div className="flex items-center gap-2 text-gray-400 text-xs">
      <Globe size={12} />
      <span>{languageNames[language] || language}</span>
    </div>
  );
};

// RTL Support Component
export const RTLSupport = ({ isRTL, onToggle }) => {
  return (
    <div className="flex items-center justify-between bg-[#0b141a] rounded-lg p-3 border border-[#00a884]/20">
      <div>
        <p className="text-white text-sm">Right-to-Left (RTL)</p>
        <p className="text-gray-400 text-xs">For Arabic and Hebrew</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-all ${
          isRTL ? 'bg-[#00a884]' : 'bg-[#1a2e35]'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transition-all ${
            isRTL ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};

export default Language;
