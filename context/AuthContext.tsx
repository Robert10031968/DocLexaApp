import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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
    console.log('🔐 AuthProvider: Initializing auth state...');
    
    // Check for existing session on app startup
    const checkSession = async () => {
      try {
        console.log('🔐 AuthProvider: Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthProvider: Error getting session:', error);
        } else if (session) {
          console.log('✅ AuthProvider: Found existing session for user:', session.user.email);
          setSession(session);
          setUser(session.user);
        } else {
          console.log('ℹ️ AuthProvider: No existing session found');
        }
      } catch (error) {
        console.error('❌ AuthProvider: Error checking session:', error);
      } finally {
        setLoading(false);
        console.log('🔐 AuthProvider: Initial auth state check complete');
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthProvider: Auth state changed:', {
          event,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          hasSession: !!session
        });
        
        if (session) {
          console.log('✅ AuthProvider: Setting new session for user:', session.user.email);
          setSession(session);
          setUser(session.user);
          
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ AuthProvider: Email sign up error:', error);
      } else {
        console.log('✅ AuthProvider: Email sign up successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected email sign up error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    console.log('🔐 AuthProvider: Attempting Google OAuth sign in...');
    try {
      // Generate the redirect URI for Expo Go using the proxy
      const redirectTo = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      console.log('🔐 AuthProvider: Using redirect URI:', redirectTo);
      console.log('🔐 AuthProvider: App owner:', 'rgoralczyk1003');
      console.log('🔐 AuthProvider: App slug:', 'doclexa');
      
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
        console.error('❌ AuthProvider: Google OAuth error:', error);
        return { error };
      }
      
      if (!data?.url) {
        console.error('❌ AuthProvider: No OAuth URL received from Supabase');
        return { error: new Error('No OAuth URL received') };
      }
      
      console.log('✅ AuthProvider: Google OAuth initiated successfully');
      console.log('🔗 AuthProvider: OAuth URL:', data.url);
      
      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      
      console.log('🌐 AuthProvider: Browser result:', result);
      
      if (result.type === 'success') {
        console.log('✅ AuthProvider: OAuth flow completed successfully');
        // The session will be automatically handled by the auth state listener
      } else if (result.type === 'cancel') {
        console.log('❌ AuthProvider: OAuth flow was cancelled by user');
        return { error: new Error('OAuth flow was cancelled') };
      } else {
        console.log('⚠️ AuthProvider: OAuth flow result:', result.type);
        return { error: new Error(`OAuth flow failed: ${result.type}`) };
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected Google OAuth error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🔐 AuthProvider: Attempting sign out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ AuthProvider: Sign out error:', error);
      } else {
        console.log('✅ AuthProvider: Sign out successful');
      }
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    console.log('🔐 AuthProvider: Attempting password reset for:', email);
    try {
      const redirectTo = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      
      if (error) {
        console.error('❌ AuthProvider: Password reset error:', error);
      } else {
        console.log('✅ AuthProvider: Password reset email sent');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ AuthProvider: Unexpected password reset error:', error);
      return { error };
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 