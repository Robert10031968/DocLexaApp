import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onCancelSubscription?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  onPrivacyPolicy,
  onTermsOfService,
  onCancelSubscription,
}) => {
  const { t } = useTranslation();

  const handlePrivacyPolicy = () => {
    if (onPrivacyPolicy) {
      onPrivacyPolicy();
    } else {
      console.log('Privacy Policy clicked');
    }
  };

  const handleTermsOfService = () => {
    if (onTermsOfService) {
      onTermsOfService();
    } else {
      console.log('Terms of Service clicked');
    }
  };

  const handleCancelSubscription = () => {
    if (onCancelSubscription) {
      onCancelSubscription();
    } else {
      console.log('Cancel Subscription clicked');
    }
  };

  return (
    <View style={styles.footer}>
      {/* Three evenly spaced links */}
      <View style={styles.linksContainer}>
        {/* Left link - Terms of Service */}
        <TouchableOpacity onPress={handleTermsOfService} style={styles.link}>
          <Text style={styles.linkText}>{t('termsOfService')}</Text>
        </TouchableOpacity>

        {/* Center link - Privacy Policy */}
        <TouchableOpacity onPress={handlePrivacyPolicy} style={styles.link}>
          <Text style={styles.linkText}>{t('privacyPolicy')}</Text>
        </TouchableOpacity>

        {/* Right link - Cancel Subscription */}
        <TouchableOpacity onPress={handleCancelSubscription} style={styles.link}>
          <Text style={styles.linkText}>{t('cancelSubscription')}</Text>
        </TouchableOpacity>
      </View>

      {/* Copyright text */}
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>
          © 2024 DocLexa. All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  link: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textAlign: 'center',
    lineHeight: 16,
  },
  copyrightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  copyrightText: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default Footer; 