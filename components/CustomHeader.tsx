import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LanguageSelector from './LanguageSelector';

const CustomHeader = () => {
  const navigation = useNavigation<any>();

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={handleMenuPress}
        activeOpacity={0.7}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
      
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/Doclexa.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <LanguageSelector style={styles.languageSelector} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(225, 229, 233, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  menuButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#2c3e50',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 32,
  },
  languageSelector: {
    padding: 8,
    minWidth: 44,
    alignItems: 'center',
  },
});

export default CustomHeader; 