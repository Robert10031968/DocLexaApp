import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'hasSeenWelcomeModal';
const LANGUAGE_KEY = 'selectedLanguage';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const [disclaimer, setDisclaimer] = useState(t('disclaimer.text'));
  const [selectedLanguage, setSelectedLanguage] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  console.log('🎯 WelcomeModal: visible =', visible, 'i18n.language =', i18n.language);

  // Update disclaimer text on language change
  useEffect(() => {
    setDisclaimer(t('disclaimer.text'));
  }, [i18n.language, t]);

  const handleLanguageSelect = useCallback(async (language: Language) => {
    setSelectedLanguage(language);
    try {
      await i18n.changeLanguage(language.code);
      await AsyncStorage.setItem(LANGUAGE_KEY, language.code);
    } catch (error) {
      console.error('Language change error:', error);
    }
  }, [i18n]);

  const handleContinue = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('welcome', 'Welcome to DocLexa')}</Text>
          
          {/* Language Selector */}
          <View style={styles.languageSection}>
            <Text style={styles.languageLabel}>{t('language', 'Language')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.languageScroll}
            >
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageButton,
                    selectedLanguage.code === language.code && styles.selectedLanguageButton
                  ]}
                  onPress={() => handleLanguageSelect(language)}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text style={[
                    styles.languageText,
                    selectedLanguage.code === language.code && styles.selectedLanguageText
                  ]}>
                    {language.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Disclaimer */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.disclaimer}>{disclaimer}</Text>
          </ScrollView>
          
          <TouchableOpacity style={styles.button} onPress={handleContinue} accessibilityLabel={t('continue', 'Continue')}>
            <Text style={styles.buttonText}>{t('continue', 'Continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const checkHasSeenWelcomeModal = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === 'true';
};

export const resetWelcomeModal = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log('🔄 WelcomeModal: Reset - modal will show again');
};

export default WelcomeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageSection: {
    width: '100%',
    marginBottom: 20,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  languageScroll: {
    paddingHorizontal: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 4,
    minWidth: 60,
    justifyContent: 'center',
  },
  selectedLanguageButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  languageFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  selectedLanguageText: {
    color: '#fff',
  },
  scroll: {
    maxHeight: 180,
    width: '100%',
    marginBottom: 24,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  disclaimer: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 