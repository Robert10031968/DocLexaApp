import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';

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
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

interface LanguageSelectorProps {
  style?: any;
  onLanguageChange?: (languageCode: string) => void;
}

const { width, height } = Dimensions.get('window');

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  style, 
  onLanguageChange 
}) => {
  const { i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setModalVisible(false);
    
    i18n.changeLanguage(language.code).then(() => {
      if (onLanguageChange) {
        onLanguageChange(language.code);
      }
    }).catch((error) => {
      Alert.alert('Error', 'Failed to change language. Please try again.');
      console.error('Language change error:', error);
    });
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectorIcon}>{selectedLanguage.flag}</Text>
        <Text style={styles.selectorText}>
          {selectedLanguage.code.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleModalClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleModalClose}
        >
          <View style={styles.modalContent}>
            <ScrollView 
              style={styles.languageList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.languageListContent}
            >
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageItem,
                    selectedLanguage.code === language.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => handleLanguageSelect(language)}
                  activeOpacity={0.7}
                >
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageFlag}>{language.flag}</Text>
                    <Text style={[
                      styles.languageName,
                      selectedLanguage.code === language.code && styles.selectedLanguageText
                    ]}>
                      {language.nativeName}
                    </Text>
                  </View>
                  {selectedLanguage.code === language.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 60,
    justifyContent: 'center',
  },
  selectorIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: width * 0.8,
    height: height * 0.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  languageList: {
    flex: 1,
  },
  languageListContent: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedLanguageItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  selectedLanguageText: {
    color: '#1976d2',
  },
  checkmark: {
    fontSize: 18,
    color: '#2196f3',
    fontWeight: 'bold',
  },
});

export default LanguageSelector; 