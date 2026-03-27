import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';

const STORAGE_KEY = 'careops-lang';
const SUPPORTED = ['en', 'hi', 'te', 'ta'];

function readSavedLang() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && SUPPORTED.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
    ta: { translation: ta },
  },
  lng: readSavedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

export default i18n;
