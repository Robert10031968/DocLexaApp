import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Footer } from '../components';

const FooterDemoScreen = () => {
  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'This would navigate to the Privacy Policy screen or open a URL.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'This would navigate to the Terms of Service screen or open a URL.');
  };

  const handleLegalDisclaimer = () => {
    Alert.alert('Legal Disclaimer', 'This would navigate to the Legal Disclaimer screen or open a URL.');
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Footer Demo</Text>
        <Text style={styles.subtitle}>
          This screen demonstrates the Footer component at the bottom of the screen.
        </Text>
        <Text style={styles.description}>
          The footer includes:
          {'\n'}• Legal links (Privacy Policy, Terms of Service, Legal Disclaimer)
          {'\n'}• Copyright information
          {'\n'}• DocLexa logo on the right side
          {'\n'}• Responsive layout using Flexbox
        </Text>
      </View>

      {/* Footer */}
      <Footer
        onPrivacyPolicy={handlePrivacyPolicy}
        onTermsOfService={handleTermsOfService}
        onLegalDisclaimer={handleLegalDisclaimer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 80, // Account for header
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default FooterDemoScreen; 