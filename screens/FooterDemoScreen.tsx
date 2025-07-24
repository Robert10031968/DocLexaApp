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

  const handleCancelSubscription = () => {
    Alert.alert('Cancel Subscription', 'This would navigate to the subscription management screen.');
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Footer Demo</Text>
        <Text style={styles.subtitle}>
          This screen demonstrates the updated Footer component at the bottom of the screen.
        </Text>
        <Text style={styles.description}>
          The simplified footer includes:
          {'\n'}• Three evenly spaced links with line breaks
          {'\n'}• Left: "Terms of Service" (split into two lines)
          {'\n'}• Center: "Privacy Policy" (split into two lines)
          {'\n'}• Right: "Cancel Subscription" (split into two lines)
          {'\n'}• Exact same width and padding as the header
          {'\n'}• Light gray background (#f2f2f2)
          {'\n'}• Clean, minimalistic design
          {'\n'}• Fully responsive layout
        </Text>
      </View>

      {/* Footer */}
      <Footer
        onPrivacyPolicy={handlePrivacyPolicy}
        onTermsOfService={handleTermsOfService}
        onCancelSubscription={handleCancelSubscription}
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