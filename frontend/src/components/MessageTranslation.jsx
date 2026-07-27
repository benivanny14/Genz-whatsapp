import React, { useState, useEffect } from 'react';
import { Languages, Copy, Check, X, RotateCcw, Globe, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageTranslation = ({ message, onTranslate, currentLanguage = 'en' }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(currentLanguage);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState(null);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
  ];

  const handleTranslate = async () => {
    setIsTranslating(true);
    setError(null);

    try {
      // Simulate translation API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock translation - in production, use Google Translate API, DeepL, etc.
      const mockTranslations = {
        sw: 'Hii ni tafsiri ya ujumbe kwa Kiswahili.',
        es: 'Esta es una traducción del mensaje al español.',
        fr: 'Ceci est une traduction du message en français.',
        de: 'Dies ist eine Übersetzung der Nachricht ins Deutsche.',
        ar: 'هذه ترجمة الرسالة إلى العربية',
        hi: 'यह संदेश का हिंदी में अनुवाद है',
        pt: 'Esta é uma tradução da mensagem para português',
      };

      const translated = mockTranslations[targetLanguage] || `Translated to ${languages.find(l => l.code === targetLanguage)?.name || targetLanguage}`;
      setTranslatedText(translated);
      setShowTranslation(true);

      if (onTranslate) {
        onTranslate(message._id, targetLanguage, translated);
      }
    } catch (err) {
      setError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
  };

  const handleRetranslate = () => {
    handleTranslate();
  };

  return (
    <div className="relative">
      {/* Translation Button */}
      <button
        onClick={() => showTranslation ? setShowTranslation(false) : handleTranslate()}
        className="text-gray-400 hover:text-[#00a884] transition-colors"
        title="Translate message"
      >
        <Languages size={16} />
      </button>

      {/* Translation Panel */}
      <AnimatePresence>
        {showTranslation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full right-0 mt-2 bg-[#1a2e35] rounded-lg shadow-xl border border-[#00a884]/30 w-80 z-50"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-[#00a884]" />
                  <span className="text-white text-sm font-medium">Translation</span>
                </div>
                <button
                  onClick={() => setShowTranslation(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Language Selector */}
              <div className="mb-3">
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    setTargetLanguage(e.target.value);
                    handleTranslate();
                  }}
                  disabled={isTranslating}
                  className="w-full bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-sm"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loading State */}
              {isTranslating && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Translated Text */}
              {!isTranslating && translatedText && (
                <div className="space-y-3">
                  <div className="bg-[#0b141a] rounded-lg p-3">
                    <p className="text-gray-200 text-sm">{translatedText}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-1"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                    <button
                      onClick={handleRetranslate}
                      className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={14} />
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-[#00a884]/20">
                <p className="text-gray-500 text-xs text-center">
                  Translated by AI • May not be accurate
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Auto Translation Component
export const AutoTranslation = ({ enabled, language, onToggle, onLanguageChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <Sparkles size={18} className="text-[#00a884]" />
            Auto Translation
          </p>
          <p className="text-gray-400 text-sm">Automatically translate foreign messages</p>
        </div>
        <button
          onClick={onToggle}
          className={`w-12 h-6 rounded-full transition-all ${
            enabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div>
            <p className="text-white text-sm mb-2">Translate to</p>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show original text</p>
              <p className="text-gray-400 text-xs">Display original message alongside translation</p>
            </div>
            <button
              onClick={() => {/* Toggle show original */}}
              className="w-12 h-6 rounded-full transition-all bg-[#0b141a]"
            >
              <div className="w-5 h-5 bg-white rounded-full transition-all translate-x-0.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Detect language automatically</p>
              <p className="text-gray-400 text-xs">Auto-detect message language</p>
            </div>
            <button
              onClick={() => {/* Toggle auto-detect */}}
              className="w-12 h-6 rounded-full transition-all bg-[#00a884]"
            >
              <div className="w-5 h-5 bg-white rounded-full transition-all translate-x-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Translation Settings Component
export const TranslationSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <AutoTranslation
        enabled={settings.autoTranslate || false}
        language={settings.translationLanguage || 'en'}
        onToggle={() => onUpdate({ ...settings, autoTranslate: !settings.autoTranslate })}
        onLanguageChange={(lang) => onUpdate({ ...settings, translationLanguage: lang })}
      />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm">Translation quality</p>
          <p className="text-gray-400 text-xs">Choose translation provider</p>
        </div>
        <select
          value={settings.translationProvider || 'google'}
          onChange={(e) => onUpdate({ ...settings, translationProvider: e.target.value })}
          className="bg-[#0b141a] text-white px-3 py-2 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
        >
          <option value="google">Google Translate</option>
          <option value="deepl">DeepL</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm">Cache translations</p>
          <p className="text-gray-400 text-xs">Store translations for faster access</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, cacheTranslations: !settings.cacheTranslations })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.cacheTranslations ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.cacheTranslations ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

// Message with Translation Display
export const TranslatedMessage = ({ originalMessage, translatedText, targetLanguage, onToggleTranslation }) => {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="space-y-2">
      {/* Translated Text */}
      <div className="bg-[#00a884]/10 border-l-2 border-[#00a884] p-3 rounded-r-lg">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={14} className="text-[#00a884]" />
          <span className="text-[#00a884] text-xs font-medium">Translated</span>
        </div>
        <p className="text-gray-200 text-sm">{translatedText}</p>
      </div>

      {/* Original Text (Collapsible) */}
      {showOriginal && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-[#0b141a] p-3 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-400 text-xs">Original</span>
          </div>
          <p className="text-gray-300 text-sm">{originalMessage}</p>
        </motion.div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setShowOriginal(!showOriginal)}
        className="text-gray-400 hover:text-[#00a884] text-xs transition-colors"
      >
        {showOriginal ? 'Hide original' : 'Show original'}
      </button>
    </div>
  );
};

export default MessageTranslation;
