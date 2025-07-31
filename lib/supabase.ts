import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://utvolelclhzesimpwbrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dm9sZWxjbGh6ZXNpbXB3YnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTU4MTcsImV4cCI6MjA2NzY5MTgxN30.M2d3R611-y_t26xsN3R6-Y0uf5bRVRDni16-m2mF1tY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: true,
  },
});

console.log('🔧 Supabase client initialized with URL:', SUPABASE_URL);



/**
 * Log a document analysis event to Supabase
 * @param {Object} params
 * @param {string|null} params.document_id - Document ID or filename (optional)
 * @param {number|null} params.tokens_used - Number of tokens used (optional)
 * @returns {Promise<{ success: boolean, error?: any }>}
 */
export async function logAnalysisEvent({ document_id = null, tokens_used = null }: { document_id?: string | null, tokens_used?: number | null } = {}) {
  try {
    // Get current user ID securely
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      throw userError || new Error('No authenticated user');
    }
    const user_id = userData.user.id;
    const { error } = await supabase.from('analysis_logs').insert([
      {
        user_id,
        document_id: document_id ?? null,
        tokens_used,
        // analyzed_at: left as default (now)
      },
    ]);
    if (error) {
      console.error('❌ Error inserting analysis log:', error);
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.error('❌ Exception in logAnalysisEvent:', err);
    return { success: false, error: err };
  }
}

/**
 * Get the current authenticated user's ID
 * @returns {Promise<string|null>}
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

/**
 * Get the count of analyses for the current user in the current month
 * @returns {Promise<number|null>} Number of analyses or null on error
 */
export async function getMonthlyAnalysisUsage(): Promise<number | null> {
  try {
    const user_id = await getCurrentUserId();
    if (!user_id) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count, error } = await supabase
      .from('analysis_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('analyzed_at', startOfMonth.toISOString());
    if (error) {
      console.error('❌ Error fetching monthly analysis usage:', error);
      return null;
    }
    return count ?? 0;
  } catch (err) {
    console.error('❌ Exception in getMonthlyAnalysisUsage:', err);
    return null;
  }
}

/**
 * Get the current user's plan (from user profile)
 * @returns {Promise<string|null>} Plan name or null
 */
export async function getUserPlan(): Promise<string | null> {
  try {
    const user_id = await getCurrentUserId();
    if (!user_id) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user_id)
      .single();
    if (error) {
      console.error('❌ Error fetching user plan:', error);
      return null;
    }
    return data?.plan ?? null;
  } catch (err) {
    console.error('❌ Exception in getUserPlan:', err);
    return null;
  }
}

/**
 * Get the complete plan information for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{ planName: string, pageLimit: number, remainingAnalyses: number }>}
 */
export async function getPlanQuota(userId: string): Promise<{ planName: string, pageLimit: number, remainingAnalyses: number }> {
  try {
    console.log('🔍 Fetching plan quota for user:', userId);
    
    // Get user's plan from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan, remaining_analyses')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile data:', profileError);
      // Return Free Trial as default when profile doesn't exist
      return {
        planName: 'Free Trial',
        pageLimit: 5, // Default free pages
        remainingAnalyses: 5
      };
    }

    const planName = profileData?.plan || 'Free Trial';
    const remainingAnalyses = profileData?.remaining_analyses || 0;

    console.log('📊 Profile data:', { planName, remainingAnalyses });

    // Get plan details from subscription_plans table
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('page_limit')
      .eq('name', planName)
      .single();

    if (planError) {
      console.error('❌ Error fetching plan data:', planError);
      // If plan doesn't exist in subscription_plans, treat as Free Trial
      return {
        planName: 'Free Trial',
        pageLimit: 5, // Default free pages
        remainingAnalyses: Math.max(0, remainingAnalyses)
      };
    }

    const pageLimit = planData?.page_limit || 5; // Default to 5 pages for Free Trial

    console.log('✅ Plan quota data:', { planName, pageLimit, remainingAnalyses });

    return {
      planName,
      pageLimit,
      remainingAnalyses
    };
  } catch (err) {
    console.error('❌ Exception in getPlanQuota:', err);
    return {
      planName: 'Free Trial',
      pageLimit: 5, // Default free pages
      remainingAnalyses: 0
    };
  }
}

/**
 * Create or update a user profile
 * @param {string} userId - The user's ID
 * @param {Object} profileData - Profile data to insert/update
 * @returns {Promise<{ success: boolean, data?: any, error?: any }>}
 */
export async function createOrUpdateProfile(
  userId: string, 
  profileData: {
    email?: string;
    plan?: string;
    subscription_plan_id?: string;
    created_at?: string;
    updated_at?: string;
  } = {}
): Promise<{ success: boolean, data?: any, error?: any }> {
  try {
    console.log('👤 Creating/updating profile for user:', userId);
    console.log('👤 Profile data:', {
      email: profileData.email,
      plan: profileData.plan,
      subscription_plan_id: profileData.subscription_plan_id,
    });
    
    const profileRecord = {
      id: userId,
      email: profileData.email,
      plan: profileData.plan || 'Free Trial',
      subscription_plan_id: profileData.subscription_plan_id || null,
      created_at: profileData.created_at || new Date().toISOString(),
      updated_at: profileData.updated_at || new Date().toISOString(),
    };
    
    console.log('👤 Inserting profile record:', profileRecord);
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert([profileRecord], {
        onConflict: 'id'
      })
      .select();

    if (error) {
      console.error('❌ Error creating/updating profile:', error);
      return { success: false, error };
    }

    console.log('✅ Profile created/updated successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Exception in createOrUpdateProfile:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if a user profile exists
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} True if profile exists
 */
export async function profileExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('ℹ️ Profile does not exist for user:', userId);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('❌ Exception in profileExists:', err);
    return false;
  }
}

/**
 * Get user plan status from the user_plan_status view
 * @param {string} userId - The user's ID
 * @returns {Promise<{ success: boolean, data?: any, error?: any }>}
 */
export async function getUserPlanStatus(userId: string): Promise<{ success: boolean, data?: any, error?: any }> {
  try {
    const { data, error } = await supabase
      .from('user_plan_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user plan status:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception in getUserPlanStatus:', err);
    return { success: false, error: err };
  }
}

/**
 * Ensure all users have profile records
 * This function can be called to create profiles for existing users
 * @returns {Promise<{ success: boolean, created: number, error?: any }>}
 */
export async function ensureAllUsersHaveProfiles(): Promise<{ success: boolean, created: number, error?: any }> {
  try {
    console.log('👤 Ensuring all users have profile records...');
    
    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return { success: false, created: 0, error: usersError };
    }
    
    let createdCount = 0;
    
    for (const user of (users?.users || [])) {
      const profileExistsResult = await profileExists(user.id);
      if (!profileExistsResult) {
        console.log('👤 Creating profile for existing user:', user.email);
        const profileResult = await createOrUpdateProfile(user.id, {
          email: user.email,
          plan: 'free',
          created_at: user.created_at,
        });
        
        if (profileResult.success) {
          createdCount++;
          console.log('✅ Profile created for user:', user.email);
        } else {
          console.error('❌ Failed to create profile for user:', user.email, profileResult.error);
        }
      }
    }
    
    console.log(`✅ Profile creation complete. Created ${createdCount} profiles.`);
    return { success: true, created: createdCount };
  } catch (err) {
    console.error('❌ Exception in ensureAllUsersHaveProfiles:', err);
    return { success: false, created: 0, error: err };
  }
} 

/**
 * Get detailed plan information including plan_kind from subscription_plans table
 * @param {string} userId - The user's ID
 * @returns {Promise<{ planName: string, pageLimit: number, remainingAnalyses: number, planKind: string | null, purchaseDate: string | null }>}
 */
export async function getDetailedPlanInfo(userId: string): Promise<{ 
  planName: string, 
  pageLimit: number, 
  remainingAnalyses: number, 
  planKind: string | null, 
  purchaseDate: string | null 
}> {
  try {
    console.log('🔍 Fetching detailed plan info for user:', userId);
    
    // Get user's plan from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('plan, remaining_analyses, subscription_plan_id, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile data:', profileError);
      // Return Free Trial as default when profile doesn't exist
      return {
        planName: 'Free Trial',
        pageLimit: 5,
        remainingAnalyses: 5,
        planKind: null,
        purchaseDate: null
      };
    }

    const planName = profileData?.plan || 'Free Trial';
    const remainingAnalyses = profileData?.remaining_analyses || 0;
    const purchaseDate = profileData?.created_at || null;

    console.log('📊 Profile data:', { planName, remainingAnalyses, purchaseDate });

    // Get plan details from subscription_plans table
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('page_limit, plan_kind')
      .eq('name', planName)
      .single();

    if (planError) {
      console.error('❌ Error fetching plan data:', planError);
      // If plan doesn't exist in subscription_plans, treat as Free Trial
      return {
        planName: 'Free Trial',
        pageLimit: 5,
        remainingAnalyses: Math.max(0, remainingAnalyses),
        planKind: null,
        purchaseDate: purchaseDate
      };
    }

    const pageLimit = planData?.page_limit || 5;
    const planKind = planData?.plan_kind || null;

    console.log('✅ Detailed plan info:', { planName, pageLimit, remainingAnalyses, planKind, purchaseDate });

    return {
      planName,
      pageLimit,
      remainingAnalyses,
      planKind,
      purchaseDate
    };
  } catch (err) {
    console.error('❌ Exception in getDetailedPlanInfo:', err);
    return {
      planName: 'Free Trial',
      pageLimit: 5,
      remainingAnalyses: 0,
      planKind: null,
      purchaseDate: null
    };
  }
} 