import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../components/LanguageSelector';

const LanguageContext = createContext();

const readStoredLanguage = () => {
  try {
    const userSettings = JSON.parse(localStorage.getItem('genz_user_settings') || '{}');
    const legacySettings = JSON.parse(localStorage.getItem('genz_settings') || '{}');
    const saved =
      userSettings.app?.language ||
      legacySettings.app?.language ||
      localStorage.getItem('genz_language');

    return saved && saved !== 'system' ? saved : 'en';
  } catch (e) {
    return 'en';
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const updateGoogleTranslate = (langCode) => {
    // Map language codes to Google Translate codes if necessary
    const gtCode = langCode === 'system' ? 'en' : langCode;
    const selectElement = document.querySelector('.goog-te-combo');
    if (selectElement) {
      selectElement.value = gtCode;
      selectElement.dispatchEvent(new Event('change'));
    }
  };

  useEffect(() => {
    // Inject Google Translate script and styling
    if (!document.getElementById('google-translate-script')) {
      const style = document.createElement('style');
      style.innerHTML = `
        body { top: 0 !important; }
        .skiptranslate { display: none !important; }
        #google_translate_element { display: none !important; }
      `;
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.id = 'google_translate_element';
      document.body.appendChild(div);

      window.googleTranslateElementInit = function() {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          autoDisplay: false
        }, 'google_translate_element');
        
        // Apply initial language after init
        setTimeout(() => {
          const savedLanguage = readStoredLanguage();
          if (savedLanguage !== 'en') {
             updateGoogleTranslate(savedLanguage);
          }
        }, 1000);
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
    }

    const handleStorageChange = () => {
      try {
        const newLang = readStoredLanguage();
        setCurrentLanguage(newLang);
        document.documentElement.lang = newLang;
        updateGoogleTranslate(newLang);
      } catch (e) {
        // ignore
      }
    };
    
    // Initial load
    handleStorageChange();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('language-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('language-changed', handleStorageChange);
    };
  }, []);

  const t = (key) => {
    return translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
