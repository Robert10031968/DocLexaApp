import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

interface FooterProps {
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onLegalDisclaimer?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  onPrivacyPolicy,
  onTermsOfService,
  onLegalDisclaimer,
}) => {
  const handlePrivacyPolicy = () => {
    if (onPrivacyPolicy) {
      onPrivacyPolicy();
    } else {
      // Default behavior - could open a URL or navigate to a screen
      console.log('Privacy Policy clicked');
    }
  };

  const handleTermsOfService = () => {
    if (onTermsOfService) {
      onTermsOfService();
    } else {
      // Default behavior - could open a URL or navigate to a screen
      console.log('Terms of Service clicked');
    }
  };

  const handleLegalDisclaimer = () => {
    if (onLegalDisclaimer) {
      onLegalDisclaimer();
    } else {
      // Default behavior - could open a URL or navigate to a screen
      console.log('Legal Disclaimer clicked');
    }
  };

  return (
    <View style={styles.footer}>
      <View style={styles.content}>
        {/* Left side - Legal Links */}
        <View style={styles.legalSection}>
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.link}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTermsOfService} style={styles.link}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLegalDisclaimer} style={styles.link}>
              <Text style={styles.linkText}>Legal Disclaimer</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyrightText}>
            © 2024 DocLexa. All rights reserved.
          </Text>
        </View>

        {/* Right side - DocLexa Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>DocLexa</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 80,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  legalSection: {
    flex: 1,
    marginRight: 20,
  },
  linksContainer: {
    marginBottom: 8,
  },
  link: {
    marginBottom: 4,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '400',
  },
  logoSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  logoContainer: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default Footer; 