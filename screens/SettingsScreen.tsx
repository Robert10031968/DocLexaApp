import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchUserPlanInfo, formatDate, UserPlanInfo } from '../lib/planInfo';

const SettingsScreen = () => {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planPrice, setPlanPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanInfo = async () => {
      setPlanError(null);
      setLoading(true);
      try {
              if (!user?.id) {
        setPlanError(t('settingsScreen.errorLoadingPlanInfo'));
        return;
      }

        console.log('🔍 SettingsScreen: Fetching plan info for user:', user.id);
        
        // Use the new fetchUserPlanInfo function
        const planData = await fetchUserPlanInfo(user.id);
        
        console.log('📊 SettingsScreen: Plan data received:', planData);
        
        setPlanInfo(planData);
        
        // Get price from subscription_plans if available (for non-Free Trial plans)
        if (planData.planName !== 'Free Trial') {
          const { data: planDetails, error: planError } = await supabase
            .from('subscription_plans')
            .select('price_usd')
            .eq('name', planData.planName)
            .single();
          
          if (!planError && planDetails?.price_usd) {
            setPlanPrice(`$${planDetails.price_usd}`);
          } else {
            setPlanPrice(null);
          }
        } else {
          setPlanPrice(null);
        }
        
      } catch (err) {
        console.error('❌ SettingsScreen: Error loading plan info:', err);
        setPlanError(t('settingsScreen.errorLoadingPlanInfo'));
        setPlanInfo(null);
        setPlanPrice(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanInfo();
  }, [user?.id, t]);

  /**
   * Handle upgrade plan button press (placeholder)
   */
  const handleUpgradePlan = () => {
    Alert.alert(
      t('settingsScreen.upgradePlan'),
      t('settingsScreen.upgradePlanAlert'),
      [{ text: t('cancel') }]
    );
  };

  /**
   * Render plan information based on plan type
   */
  const renderPlanInfo = () => {
    if (loading) {
      return <Text style={styles.planLoading}>{t('settingsScreen.loadingPlanInfo')}</Text>;
    }

    if (planError) {
      return <Text style={styles.planError}>{planError}</Text>;
    }

    if (!planInfo || !planInfo.hasActivePlan) {
              return (
          <View style={styles.noPlanContainer}>
            <Text style={styles.noPlanTitle}>{t('settingsScreen.noActivePlan')}</Text>
            <Text style={styles.noPlanText}>
              {t('settingsScreen.noActivePlanDescription')}
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradePlan}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>{t('settingsScreen.upgradePlan')}</Text>
            </TouchableOpacity>
          </View>
        );
    }

    // Render plan-specific information
    switch (planInfo.planType) {
      case 'free_trial':
                  return (
            <>
              <Text style={styles.planNameDisplay}>{t('settingsScreen.currentPlan')}: {planInfo.planName}</Text>
              <Text style={styles.planQuotaDisplay}>{t('settingsScreen.remainingAnalyses')}: {planInfo.remainingPages}</Text>
              <Text style={styles.planDescription}>{t('settingsScreen.freeTrialDescription')}</Text>
            </>
          );

              case 'subscription':
          return (
            <>
              <Text style={styles.planNameDisplay}>{t('settingsScreen.currentPlan')}: {planInfo.planName}</Text>
              <Text style={styles.planQuotaDisplay}>{t('settingsScreen.monthlyLimit')}: {planInfo.pageLimit} analyses</Text>
              <Text style={styles.planQuotaDisplay}>{t('settingsScreen.remainingAnalyses')}: {planInfo.remainingPages}</Text>
              {planPrice && <Text style={styles.planPriceDisplay}>{t('settingsScreen.price')}: {planPrice}</Text>}
              <Text style={styles.planRenewalDisplay}>{t('settingsScreen.renewsOn')}: {formatDate(planInfo.renewsOn || null)}</Text>
            </>
          );

              case 'pack':
          return (
            <>
              <Text style={styles.planNameDisplay}>{t('settingsScreen.currentPack')}: {planInfo.planName}</Text>
              <Text style={styles.planQuotaDisplay}>{t('settingsScreen.packSize')}: {planInfo.pageLimit} analyses</Text>
              <Text style={styles.planQuotaDisplay}>{t('settingsScreen.remainingAnalyses')}: {planInfo.remainingPages}</Text>
              {planPrice && <Text style={styles.planPriceDisplay}>{t('settingsScreen.price')}: {planPrice}</Text>}
              <Text style={styles.planRenewalDisplay}>{t('settingsScreen.expiresOn')}: {formatDate(planInfo.expiresOn || null)}</Text>
            </>
          );

              default:
          return <Text style={styles.planError}>{t('settingsScreen.unknownPlanType')}</Text>;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settingsScreen.logout'),
      t('settingsScreen.logoutConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('settingsScreen.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // The AuthContext will handle the navigation automatically
            } catch (error) {
              Alert.alert(t('error'), t('settingsScreen.logoutError'));
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
          <Text style={styles.sectionTitle}>{t('settingsScreen.account')}</Text>
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userStatus}>{t('settingsScreen.activeAccount')}</Text>
            </View>
          </View>
        </View>



        {/* Plan Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settingsScreen.planInformation')}</Text>
          <View style={styles.planCard}>
            {renderPlanInfo()}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settingsScreen.actions')}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>{t('settingsScreen.logout')}</Text>
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
  planError: {
    color: '#b71c1c',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  planNameDisplay: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'center',
  },
  planQuotaDisplay: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
    textAlign: 'center',
  },
  planPriceDisplay: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  planRenewalDisplay: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  planLoading: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  planDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  noPlanContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noPlanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  noPlanText: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
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
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen; 