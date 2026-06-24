import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../components/LanguageSelector';

const LanguageContext = createContext({ currentLanguage: 'en', t: k => k, changeLanguage: () => {} });

const readStoredLanguage = () => {
  try {
    const s = JSON.parse(localStorage.getItem('genz_user_settings') || '{}');
    const l = JSON.parse(localStorage.getItem('genz_settings') || '{}');
    return s.app?.language || l.app?.language || localStorage.getItem('genz_language') || 'en';
  } catch { return 'en'; }
};

const applyGoogleTranslate = (lang) => {
  // Set cookie for Google Translate
  const code = lang === 'en' ? null : lang;
  if (!code) {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname}`;
    // Try to restore English without reload
    try {
      const bar = document.querySelector('#goog-gt-tt');
      if (bar) bar.remove();
      const combo = document.querySelector('.goog-te-combo');
      if (combo) { combo.value = 'en'; combo.dispatchEvent(new Event('change')); return; }
    } catch (_) {}
    window.location.reload();
    return;
  }
  document.cookie = `/en/${code}`;
  document.cookie = `googtrans=/en/${code}; path=/`;
  document.cookie = `googtrans=/en/${code}; path=/; domain=${location.hostname}`;
  const combo = document.querySelector('.goog-te-combo');
  if (combo) { combo.value = code; combo.dispatchEvent(new Event('change')); }
  else window.location.reload();
};

let gtInited = false;
const injectGT = () => {
  if (gtInited || document.getElementById('google-translate-script')) { gtInited = true; return; }
  gtInited = true;
  const style = document.createElement('style');
  style.textContent = 'body{top:0!important} .skiptranslate,.goog-te-banner-frame{display:none!important} #google_translate_element{display:none!important}';
  document.head.appendChild(style);
  const div = Object.assign(document.createElement('div'), { id: 'google_translate_element', style: 'display:none' });
  document.body.appendChild(div);
  window.googleTranslateElementInit = () => new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
  const s = document.createElement('script');
  s.id = 'google-translate-script';
  s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(readStoredLanguage);

  useEffect(() => {
    injectGT();
    document.documentElement.lang = currentLanguage;
    const onStorageChange = () => {
      const lang = readStoredLanguage();
      if (lang !== currentLanguage) { setCurrentLanguage(lang); document.documentElement.lang = lang; }
    };
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('language-changed', onStorageChange);
    return () => { window.removeEventListener('storage', onStorageChange); window.removeEventListener('language-changed', onStorageChange); };
  }, [currentLanguage]);

  const changeLanguage = useCallback((lang) => {
    // Persist
    localStorage.setItem('genz_language', lang);
    try {
      const s = JSON.parse(localStorage.getItem('genz_user_settings') || '{}');
      if (!s.app) s.app = {};
      s.app.language = lang;
      localStorage.setItem('genz_user_settings', JSON.stringify(s));
    } catch (_) {}
    setCurrentLanguage(lang);
    document.documentElement.lang = lang;
    applyGoogleTranslate(lang);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
  }, []);

  const t = useCallback((key) => translations[currentLanguage]?.[key] || translations.en?.[key] || key, [currentLanguage]);

  return <LanguageContext.Provider value={{ currentLanguage, t, changeLanguage }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
