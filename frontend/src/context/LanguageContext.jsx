import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../components/LanguageSelector';

const LanguageContext = createContext({ currentLanguage: 'en', t: k => k, changeLanguage: () => {} });

const getSystemLanguage = () => {
  const lang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  return lang || 'en';
};

const readStoredLanguage = () => {
  try {
    const s = JSON.parse(localStorage.getItem('genz_user_settings') || '{}');
    const l = JSON.parse(localStorage.getItem('genz_settings') || '{}');
    return s.app?.language || l.app?.language || localStorage.getItem('genz_language') || 'en';
  } catch { return 'en'; }
};

const getEffectiveLanguage = (lang) => {
  if (!lang || lang === 'system') return getSystemLanguage();
  return lang;
};

// Silently sync the googtrans cookie to match the stored language, with NO
// reload and no dependency on the widget already being loaded. Safe to call
// on every mount/render — Google Translate reads this cookie itself once its
// script finishes initializing, so no forced action is needed here.
const syncGoogTransCookie = (lang) => {
  const code = getEffectiveLanguage(lang);
  if (!code || code === 'en') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${location.hostname}`;
    return;
  }
  document.cookie = `googtrans=/en/${code}; path=/`;
  document.cookie = `googtrans=/en/${code}; path=/; domain=${location.hostname}`;
};

// User-initiated language switch. This is the ONLY path allowed to force a
// page reload — and only as a last resort, when the widget is already
// loaded but doesn't expose a `.goog-te-combo` to drive directly. Because
// it's tied to an explicit user action (not a mount/render effect), it can
// never fire repeatedly or loop.
const applyGoogleTranslate = (lang) => {
  syncGoogTransCookie(lang);
  const code = getEffectiveLanguage(lang);
  try {
    if (code === 'en') {
      const bar = document.querySelector('#goog-gt-tt');
      if (bar) bar.remove();
    }
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = code === 'en' ? 'en' : code;
      combo.dispatchEvent(new Event('change'));
      return;
    }
  } catch (_) {}
  // Widget not ready yet (script still loading) — the cookie we just set
  // will be picked up automatically once it finishes initializing, no
  // reload necessary. Only reload if the widget script has definitely
  // already loaded (so we know a reload will actually pick things up).
  if (document.getElementById('google-translate-script') && window.google?.translate) {
    window.location.reload();
  }
};

let gtInited = false;
const injectGT = () => {
  if (gtInited || document.getElementById('google-translate-script')) { gtInited = true; return; }
  gtInited = true;
  const style = document.createElement('style');
  // Google Translate normally shows a top banner iframe while it loads/
  // translates ("Translating this page..."), a floating tooltip balloon
  // over translated words, and pushes body down with an inline top offset.
  // We want translation to happen fully in the background, so hide every
  // piece of that chrome and keep the page pinned at top:0.
  style.textContent = `
    body { top: 0 !important; }
    .skiptranslate,
    .goog-te-banner-frame,
    .goog-te-menu-frame,
    .goog-te-balloon-frame,
    .goog-tooltip,
    .goog-tooltip:hover,
    .goog-text-highlight,
    #goog-gt-tt,
    #goog-gt-,
    .goog-te-spinner-pos,
    .goog-te-gadget-icon,
    #google_translate_element {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
    }
  `;
  document.head.appendChild(style);
  const div = Object.assign(document.createElement('div'), { id: 'google_translate_element', style: 'display:none' });
  document.body.appendChild(div);
  window.googleTranslateElementInit = () => new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
  const s = document.createElement('script');
  s.id = 'google-translate-script';
  s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(s);

  // Google Translate re-applies an inline `top` offset on <body> and can
  // re-inject the banner iframe after each translation pass — a plain CSS
  // rule alone sometimes loses that race. Keep resetting it silently so the
  // "translating..." bar never becomes visible to the user, even briefly.
  const keepHidden = () => {
    if (document.body && document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }
  };
  const observer = new MutationObserver(keepHidden);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true });
};

export const LanguageProvider = ({ children }) => {
  const [rawLanguage, setRawLanguage] = useState(readStoredLanguage);

  // Runs ONCE on mount only. Loading the Google Translate script and wiring
  // up cross-tab sync listeners should never repeat — repeating this (as the
  // old code did, by depending on `rawLanguage`) was what caused the app to
  // silently reload itself over and over on mobile: every language-state
  // change re-ran a reload-capable "apply" call before the translate script
  // had finished loading, so the page kept restarting and never settled.
  useEffect(() => {
    injectGT();
    syncGoogTransCookie(rawLanguage);
    document.documentElement.lang = getEffectiveLanguage(rawLanguage);

    const onStorageChange = () => {
      const lang = readStoredLanguage();
      setRawLanguage((prev) => (lang !== prev ? lang : prev));
    };
    window.addEventListener('storage', onStorageChange);
    window.addEventListener('language-changed', onStorageChange);
    return () => {
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('language-changed', onStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the <html lang> attribute and cookie in sync whenever the language
  // state changes, WITHOUT ever reloading the page or touching the widget —
  // that side effect only happens inside changeLanguage(), triggered by an
  // explicit user action.
  useEffect(() => {
    document.documentElement.lang = getEffectiveLanguage(rawLanguage);
    syncGoogTransCookie(rawLanguage);
  }, [rawLanguage]);

  const changeLanguage = useCallback((lang) => {
    // Persist raw preference
    localStorage.setItem('genz_language', lang);
    try {
      const s = JSON.parse(localStorage.getItem('genz_user_settings') || '{}');
      if (!s.app) s.app = {};
      s.app.language = lang;
      localStorage.setItem('genz_user_settings', JSON.stringify(s));
    } catch (_) {}
    setRawLanguage(lang);
    applyGoogleTranslate(lang);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
  }, []);

  const t = useCallback((key) => {
    const effectiveLang = getEffectiveLanguage(rawLanguage);
    return translations[effectiveLang]?.[key] || translations.en?.[key] || key;
  }, [rawLanguage]);

  return <LanguageContext.Provider value={{ currentLanguage: rawLanguage, t, changeLanguage }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
