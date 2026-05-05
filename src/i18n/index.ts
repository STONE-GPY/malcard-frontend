import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ko } from './locales/ko';
import { en } from './locales/en';
import { ru } from './locales/ru';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'malcard-language';

export function loadStoredLanguage(): SupportedLanguage {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (SUPPORTED_LANGUAGES as readonly string[]).includes(v)) {
      return v as SupportedLanguage;
    }
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'ko').slice(0, 2);
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(nav)) {
    return nav as SupportedLanguage;
  }
  return 'ko';
}

export function saveLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: loadStoredLanguage(),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
