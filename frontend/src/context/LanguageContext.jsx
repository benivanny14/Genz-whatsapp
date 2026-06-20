import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../components/LanguageSelector';

const LanguageContext = createContext();

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
          const settings = JSON.parse(localStorage.getItem('genz_settings') || '{}');
          if (settings.app?.language && settings.app.language !== 'system' && settings.app.language !== 'en') {
             updateGoogleTranslate(settings.app.language);
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
        const settings = JSON.parse(localStorage.getItem('genz_settings') || '{}');
        const newLang = (settings.app && settings.app.language && settings.app.language !== 'system') 
            ? settings.app.language 
            : 'en';
        
        setCurrentLanguage(newLang);
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
