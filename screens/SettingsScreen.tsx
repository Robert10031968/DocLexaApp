import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/LanguageSelector';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const [currentPlan] = useState('Basic');
  const [pagesUsed] = useState(7);
  const [totalPages] = useState(20);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // The AuthContext will handle the navigation automatically
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userStatus}>Active Account</Text>
            </View>
          </View>
        </View>

        {/* Language Selector Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.languageContainer}>
            <LanguageSelector style={styles.languageSelector} />
            <Text style={styles.languageDescription}>
              Choose your preferred language for the app
            </Text>
          </View>
        </View>

        {/* Plan Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Information</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{currentPlan} Plan</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Active</Text>
              </View>
            </View>
            <View style={styles.usageContainer}>
              <Text style={styles.usageText}>
                {pagesUsed} of {totalPages} pages used this month
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(pagesUsed / totalPages) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.usageSubtext}>
                {totalPages - pagesUsed} pages remaining
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  languageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageSelector: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  languageDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  planBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  usageContainer: {
    marginTop: 8,
  },
  usageText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  usageSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen; 