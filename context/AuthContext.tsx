import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase, createOrUpdateProfile, profileExists } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to get the correct email from user object
const getUserEmail = (user: any): string => {
  // Try different possible locations for email
  if (user.email) {
    return user.email;
  }
  if (user.user_metadata?.email) {
    return user.user_metadata.email;
  }
  if (user.identities?.[0]?.identity_data?.email) {
    return user.identities[0].identity_data.email;
  }
  console.warn('⚠️ AuthProvider: Could not find email for user:', user.id);
  return '';
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  testGoogleOAuthConfig: () => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    // Check for existing session on app startup
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (session) {
          setSession(session);
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Check if profile exists and create if needed
          try {
            const profileExistsResult = await profileExists(session.user.id);
            if (!profileExistsResult) {
              console.log('👤 AuthProvider: Creating profile for user:', session.user.id);
              const userEmail = getUserEmail(session.user);
              console.log('👤 AuthProvider: Creating profile with email:', userEmail);
              
              const profileResult = await createOrUpdateProfile(session.user.id, {
                email: userEmail,
                plan: 'Free Trial',
                created_at: session.user.created_at,
              });
              
              if (profileResult.success) {
                console.log('✅ AuthProvider: Profile created successfully');
              } else {
                console.error('❌ AuthProvider: Failed to create profile:', profileResult.error);
              }
            } else {
              console.log('ℹ️ AuthProvider: Profile already exists for user:', session.user.id);
            }
          } catch (profileError) {
            console.error('❌ AuthProvider: Error checking/creating profile:', profileError);
          }
          
          // Store session in AsyncStorage for persistence
          try {
            await AsyncStorage.setItem('supabase_session', JSON.stringify(session));
            console.log('💾 AuthProvider: Session stored in AsyncStorage');
          } catch (error) {
            console.error('❌ AuthProvider: Error storing session:', error);
          }
        } else {
          console.log('🚪 AuthProvider: Clearing session - user signed out');
          setSession(null);
          setUser(null);
          
          // Clear session from AsyncStorage
          try {
            await AsyncStorage.removeItem('supabase_session');
            console.log('🗑️ AuthProvider: Session cleared from AsyncStorage');
          } catch (error) {
            console.error('❌ AuthProvider: Error clearing session:', error);
          }
        }
      }
    );

    return () => {
      console.log('🔐 AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthProvider: Attempting email/password sign in for:', email);
    
    // Test credentials for development
    if (email === 'rgoralczyk1003@gmail.com' && password === 'test1234') {
      console.log('🔐 AuthProvider: Using test credentials - bypassing normal auth');
      
      // Create a mock session for the test user
      const mockUser = {
        id: 'test-user-id',
        email: 'rgoralczyk1003@gmail.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: [],
      };
      
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser,
      };
      
      console.log('✅ AuthProvider: Test user authenticated successfully');
      setSession(mockSession as any);
      setUser(mockUser as any);
      
      // Create profile for test user
      try {
        const profileResult = await createOrUpdateProfile('test-user-id', {
          email: 'rgoralczyk1003@gmail.com',
          plan: 'Free Trial',
          created_at: new Date().toISOString(),
        });
        
        if (profileResult.success) {
          console.log('✅ AuthProvider: Test user profile created successfully');
        } else {
          console.error('❌ AuthProvider: Failed to create test user profile:', profileResult.error);
        }
      } catch (profileError) {
        console.error('❌ AuthProvider: Error creating test user profile:', profileError);
      }
      
      return { error: null };
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ AuthProvider: Email sign in error:', error);
      } else {
        console.log('✅ AuthProvider: Email sign in successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected email sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('🔐 AuthProvider: Attempting email/password sign up for:', email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ AuthProvider: Email sign up error:', error);
        
        // Handle specific error cases
        if (error.message?.toLowerCase().includes('user already registered') || 
            error.message?.toLowerCase().includes('already registered')) {
          console.log('ℹ️ AuthProvider: User already registered but email not confirmed');
          return { 
            error: {
              message: 'This email is already registered. Please check your inbox or log in.',
              originalError: error
            }
          };
        }
        
        return { error };
      }
      
      // Check if user was created successfully
      if (data?.user) {
        console.log('✅ AuthProvider: User created successfully:', data.user.email);
        
        // Create profile record for the new user
        try {
          const userEmail = getUserEmail(data.user);
          console.log('👤 AuthProvider: Creating profile with email:', userEmail);
          
          const profileResult = await createOrUpdateProfile(data.user.id, {
            email: userEmail,
            plan: 'Free Trial',
            created_at: data.user.created_at,
          });
          
          if (profileResult.success) {
            console.log('✅ AuthProvider: Profile created successfully for user:', data.user.id);
          } else {
            console.error('❌ AuthProvider: Failed to create profile:', profileResult.error);
          }
        } catch (profileError) {
          console.error('❌ AuthProvider: Error creating profile:', profileError);
        }
        
        // If user is automatically signed in (some configurations do this)
        if (data.session) {
          console.log('✅ AuthProvider: User automatically signed in after signup');
          setSession(data.session);
          setUser(data.user);
        }
        
        return { error: null };
      } else {
        console.error('❌ AuthProvider: No user data returned from signup');
        return { 
          error: {
            message: 'Failed to create user account. Please try again.',
            originalError: new Error('No user data returned')
          }
        };
      }
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected email sign up error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Generate the redirect URI for Expo Go using the proxy
      const redirectTo = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      
      // Initiate OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      if (!data?.url) {
        return { error: new Error('No OAuth URL received') };
      }
      
      // Open the OAuth URL in the browser and handle the response
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      
      if (result.type === 'success' && result.url) {
        // Extract the auth code from the URL
        const url = new URL(result.url);
        const authCode = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        if (error) {
          return { error: new Error(`OAuth error: ${error} - ${errorDescription}`) };
        }
        
        if (authCode) {
          // Exchange the auth code for a session
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(authCode);
          
          if (sessionError) {
            return { error: sessionError };
          }
          
          if (sessionData.session) {
            // Check if profile exists and create if needed
            try {
              const profileExistsResult = await profileExists(sessionData.session.user.id);
              if (!profileExistsResult) {
                const userEmail = getUserEmail(sessionData.session.user);
                
                const profileResult = await createOrUpdateProfile(sessionData.session.user.id, {
                  email: userEmail,
                  plan: 'Free Trial',
                  created_at: sessionData.session.user.created_at,
                });
                
                if (!profileResult.success) {
                  console.error('Failed to create profile for Google OAuth user:', profileResult.error);
                }
              }
            } catch (profileError) {
              console.error('Error checking/creating profile for Google OAuth user:', profileError);
            }
            
            // Update the auth state with the new session
            setSession(sessionData.session);
            setUser(sessionData.session.user);
            
            // Store session in AsyncStorage
            try {
              await AsyncStorage.setItem('supabase_session', JSON.stringify(sessionData.session));
            } catch (storageError) {
              console.error('Error storing session:', storageError);
            }
          }
          
          return { error: null };
        } else {
          return { error: new Error('No auth code received') };
        }
      } else if (result.type === 'cancel') {
        return { error: new Error('OAuth flow was cancelled') };
      } else {
        return { error: new Error(`OAuth flow failed: ${result.type}`) };
      }
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const testGoogleOAuthConfig = async () => {
    try {
      const redirectTo = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        return { success: false, error };
      }
      
      if (!data?.url) {
        return { success: false, error: new Error('No OAuth URL received') };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    testGoogleOAuthConfig,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 