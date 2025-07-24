import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import './src/i18n'; // Initialize i18n
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthNavigator from './navigation/AuthNavigator';
import { supabase } from './lib/supabase';

// Complete any auth session that might be pending
WebBrowser.maybeCompleteAuthSession();

// Component to handle auth state logging
const AuthStateLogger: React.FC = () => {
  const { session, user, loading } = useAuth();

  useEffect(() => {
    console.log('📱 App: Auth state updated:', {
      hasSession: !!session,
      userId: user?.id,
      userEmail: user?.email,
      loading
    });
  }, [session, user, loading]);

  return null;
};

// Main app component with auth provider
const AppWithAuth: React.FC = () => {
  useEffect(() => {
    console.log('📱 App: Initializing DocLexaApp...');
    
    // Set up additional auth state listener for debugging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('📱 App: Supabase auth event:', {
          event,
          hasSession: !!session,
          userEmail: session?.user?.email
        });
      }
    );

    return () => {
      console.log('📱 App: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
      <AuthStateLogger />
      <AuthNavigator />
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}
