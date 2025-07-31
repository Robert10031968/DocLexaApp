import { supabase } from './supabase';

export interface UserPlanInfo {
  planName: string;
  planType: 'free_trial' | 'subscription' | 'pack';
  remainingPages: number;
  pageLimit: number;
  renewsOn?: string;
  expiresOn?: string | null;
  hasActivePlan: boolean;
}

/**
 * Get comprehensive plan and usage information for a user
 * @param userId - The user's ID
 * @returns Promise<UserPlanInfo> - Complete plan and usage information
 */
export async function fetchUserPlanInfo(userId: string): Promise<UserPlanInfo> {
  try {
    console.log('🔍 Fetching comprehensive plan info for user:', userId);
    
    // Get user's plan from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan, remaining_analyses, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile data:', profileError);
      // Return Free Trial as default when profile doesn't exist
      return {
        planName: 'Free Trial',
        planType: 'free_trial',
        remainingPages: 5,
        pageLimit: 5,
        hasActivePlan: true,
      };
    }

    const planName = profileData?.plan || 'Free Trial';
    const remainingPages = profileData?.remaining_analyses || 0;
    const purchaseDate = profileData?.created_at || null;

    console.log('📊 Profile data:', { planName, remainingPages, purchaseDate });

    // If it's Free Trial, return early
    if (planName === 'Free Trial') {
      return {
        planName: 'Free Trial',
        planType: 'free_trial',
        remainingPages: Math.max(0, remainingPages),
        pageLimit: 5,
        hasActivePlan: true,
      };
    }

    // Get plan details from subscription_plans table
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('page_limit, plan_kind, duration_days')
      .eq('name', planName)
      .single();

    if (planError) {
      console.error('❌ Error fetching plan data:', planError);
      // If plan doesn't exist in subscription_plans, treat as Free Trial
      return {
        planName: 'Free Trial',
        planType: 'free_trial',
        remainingPages: Math.max(0, remainingPages),
        pageLimit: 5,
        hasActivePlan: true,
      };
    }

    const pageLimit = planData?.page_limit || 5;
    const planKind = planData?.plan_kind || null;
    const durationDays = planData?.duration_days || 90;

    console.log('✅ Plan data:', { planName, pageLimit, planKind, durationDays, remainingPages });

    // Determine plan type and return appropriate data
    if (planKind === 'subscription') {
      const renewsOn = calculateRenewalDate();
      return {
        planName,
        planType: 'subscription',
        remainingPages: Math.max(0, remainingPages),
        pageLimit,
        renewsOn,
        hasActivePlan: true,
      };
    } else if (planKind === 'pack') {
      const expiresOn = purchaseDate ? calculateExpiryDate(purchaseDate, durationDays) : null;
      return {
        planName,
        planType: 'pack',
        remainingPages: Math.max(0, remainingPages),
        pageLimit,
        expiresOn,
        hasActivePlan: true,
      };
    } else {
      // Unknown plan kind, treat as Free Trial
      return {
        planName: 'Free Trial',
        planType: 'free_trial',
        remainingPages: Math.max(0, remainingPages),
        pageLimit: 5,
        hasActivePlan: true,
      };
    }
  } catch (err) {
    console.error('❌ Exception in fetchUserPlanInfo:', err);
    return {
      planName: 'Free Trial',
      planType: 'free_trial',
      remainingPages: 5,
      pageLimit: 5,
      hasActivePlan: true,
    };
  }
}

/**
 * Calculate expiry date for packs (based on duration_days from purchase)
 * @param purchaseDate - ISO string of purchase date
 * @param durationDays - Number of days the pack is valid
 * @returns ISO string of expiry date
 */
function calculateExpiryDate(purchaseDate: string, durationDays: number): string {
  const purchase = new Date(purchaseDate);
  const expiry = new Date(purchase.getTime() + (durationDays * 24 * 60 * 60 * 1000));
  return expiry.toISOString();
}

/**
 * Calculate renewal date for subscriptions (1st of next month)
 * @returns ISO string of renewal date
 */
function calculateRenewalDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'No expiration';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    return 'Invalid date';
  }
}

/**
 * Get display text for HomeScreen based on plan type
 * @param planInfo - User plan information
 * @returns Formatted display text
 */
export function getHomeScreenDisplayText(planInfo: UserPlanInfo): string {
  if (planInfo.planType === 'free_trial') {
    return `Free Trial – ${planInfo.remainingPages} pages left`;
  } else if (planInfo.planType === 'subscription') {
    return `Remaining analyses: ${planInfo.remainingPages}`;
  } else if (planInfo.planType === 'pack') {
    return `Remaining analyses: ${planInfo.remainingPages}`;
  } else {
    return 'No active plan – Free Trial available';
  }
} 