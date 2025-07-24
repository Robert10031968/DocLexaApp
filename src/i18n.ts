import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import pl from './locales/pl.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import vi from './locales/vi.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  pl: { translation: pl },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  fr: { translation: fr },
  zh: { translation: zh },
  vi: { translation: vi },
};

// Get device locale and extract language code
const getDeviceLanguage = (): string => {
  const locales = getLocales();
  const locale = locales[0]?.languageCode || 'en';
  
  // Check if we support this language, otherwise fallback to 'en'
  const supportedLanguages = Object.keys(resources);
  return supportedLanguages.includes(locale) ? locale : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    debug: __DEV__, // Enable debug mode only in development
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    react: {
      useSuspense: false, // Disable Suspense for React Native
    },
  });

export default i18n; 