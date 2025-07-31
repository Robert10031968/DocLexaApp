import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchUserPlanInfo, formatDate, UserPlanInfo } from '../lib/planInfo';
import { useAuth } from '../context/AuthContext';

const PlanInformationScreen: React.FC = () => {
  const { user } = useAuth();
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch plan data from the centralized helper
   */
  const fetchPlanData = async () => {
    if (!user?.id) {
      setError('No authenticated user found');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('🔍 Fetching plan data for user:', user.id);
      
      const planData = await fetchUserPlanInfo(user.id);
      console.log('✅ Plan info received:', planData);
      
      setPlanInfo(planData);
      
    } catch (err) {
      console.error('❌ Exception in fetchPlanData:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPlanData();
    }, [user?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlanData();
  };

  /**
   * Render a plan information card
   */
  const renderPlanCard = (title: string, value: string | number, subtitle?: string, isError?: boolean) => (
    <View style={[styles.card, isError && styles.errorCard]}>
      <Text style={[styles.cardTitle, isError && styles.errorCardTitle]}>{title}</Text>
      <Text style={[styles.cardValue, isError && styles.errorCardValue]}>{value}</Text>
      {subtitle && <Text style={[styles.cardSubtitle, isError && styles.errorCardSubtitle]}>{subtitle}</Text>}
    </View>
  );

  /**
   * Render plan-specific cards based on plan type
   */
  const renderPlanSpecificCards = () => {
    if (!planInfo) return null;

    const cards = [];

    switch (planInfo.planType) {
      case 'free_trial':
        // Free Trial: Show only remaining analyses and description
        cards.push(
          renderPlanCard(
            'Remaining analyses',
            planInfo.remainingPages,
            'You can analyze up to 5 pages for free.'
          )
        );
        break;

      case 'subscription':
        // Subscription: Show plan name, monthly limit, remaining analyses, and renewal date
        cards.push(
          renderPlanCard(
            'Current Plan',
            planInfo.planName,
            'Your active subscription plan'
          ),
          renderPlanCard(
            'Monthly limit',
            `${planInfo.pageLimit} pages`,
            'Pages included in your monthly plan'
          ),
          renderPlanCard(
            'Remaining analyses',
            planInfo.remainingPages,
            'Document analyses remaining this month'
          ),
          renderPlanCard(
            'Renews on',
            formatDate(planInfo.renewsOn || null),
            'Next billing date'
          )
        );
        break;

      case 'pack':
        // Pack: Show pack name, pack size, remaining analyses, and expiration date
        cards.push(
          renderPlanCard(
            'Pack',
            planInfo.planName,
            'Your active page pack'
          ),
          renderPlanCard(
            'Pack size',
            `${planInfo.pageLimit} pages`,
            'Total pages in your pack'
          ),
          renderPlanCard(
            'Remaining analyses',
            planInfo.remainingPages,
            'Pages remaining in your pack'
          ),
          renderPlanCard(
            'Expires on',
            formatDate(planInfo.expiresOn || null),
            'When your pack expires'
          )
        );
        break;
    }

    return cards;
  };

  /**
   * Handle upgrade plan button press (placeholder)
   */
  const handleUpgradePlan = () => {
    Alert.alert(
      'Upgrade Plan',
      'This would navigate to the plan selection screen.',
      [{ text: 'OK' }]
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading plan information...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.header}>Plan Information</Text>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>Pull down to refresh</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // No active plan state
  if (!planInfo || !planInfo.hasActivePlan) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.header}>Plan Information</Text>
          
          <View style={styles.noPlanSection}>
            <Text style={styles.noPlanTitle}>No Active Plan</Text>
            <Text style={styles.noPlanText}>
              You don't have an active plan. Upgrade to start analyzing documents again.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradePlan}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Available Plans</Text>
            <Text style={styles.infoText}>
              • Free Trial: 5 analyses{'\n'}
              • Subscription plans: Monthly billing{'\n'}
              • Page packs: One-time purchase{'\n'}
              • Upgrade anytime to get more analyses
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Main content with plan information
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.header}>Plan Information</Text>
        
        {planInfo && (
          <View style={styles.cardsContainer}>
            {renderPlanSpecificCards()}
          </View>
        )}
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Free Trial includes 5 analyses{'\n'}
            • Subscription plans renew monthly{'\n'}
            • Page packs expire after 90 days{'\n'}
            • Upgrade anytime to get more analyses
          </Text>
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  cardsContainer: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorCard: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  errorCardTitle: {
    color: '#c53030',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  errorCardValue: {
    color: '#c53030',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  errorCardSubtitle: {
    color: '#c53030',
  },
  noPlanSection: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderColor: '#fed7d7',
    borderWidth: 1,
    alignItems: 'center',
  },
  noPlanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c53030',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPlanText: {
    fontSize: 14,
    color: '#c53030',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderColor: '#fed7d7',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 16,
    color: '#c53030',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default PlanInformationScreen; 