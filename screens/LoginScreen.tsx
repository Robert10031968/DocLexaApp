import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import OAuthDebugger from '../components/OAuthDebugger';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { t } = useTranslation();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (isSignUp) {
        Alert.alert(
          'Success', 
          'Account created! Please check your email to verify your account.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('🔐 LoginScreen: Starting Google OAuth flow...');
    setGoogleLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('❌ LoginScreen: Google OAuth error:', error);
        Alert.alert(
          'Google Sign-In Failed', 
          error.message || 'Unable to sign in with Google. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ LoginScreen: Google OAuth initiated successfully');
        // The browser should open automatically for OAuth flow
        // The auth state change will handle navigation after successful login
      }
    } catch (error) {
      console.error('❌ LoginScreen: Unexpected Google OAuth error:', error);
      Alert.alert(
        'Error', 
        'An unexpected error occurred during Google sign-in. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Success', 
          'Password reset email sent! Please check your email.',
          [{ text: 'OK' }]
        );
        setForgotPassword(false);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>📄</Text>
            <Text style={styles.title}>DocLexa</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Auth Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {!forgotPassword && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={togglePasswordVisibility}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!isSignUp && !forgotPassword && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setForgotPassword(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={forgotPassword ? handleForgotPassword : handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.authButtonText}>
                  {forgotPassword 
                    ? 'Send Reset Email' 
                    : isSignUp 
                      ? 'Sign Up' 
                      : 'Sign In'
                  }
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            {!forgotPassword && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
            )}

            {/* Google Sign In Button */}
            {!forgotPassword && (
              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.8}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285F4" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

                      {/* Toggle between Sign In/Sign Up */}
            {!forgotPassword && (
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    setEmail('');
                    setPassword('');
                    setShowPassword(false);
                  }}
                >
                  <Text style={styles.toggleButton}>
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Debug Button */}
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => setShowDebug(!showDebug)}
            >
              <Text style={styles.debugButtonText}>
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </Text>
            </TouchableOpacity>

            {/* Debug Information */}
            {showDebug && <OAuthDebugger />}

          {/* Back to Sign In from Forgot Password */}
          {forgotPassword && (
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => {
                  setForgotPassword(false);
                  setEmail('');
                  setShowPassword(false);
                }}
              >
                <Text style={styles.toggleButton}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 50, // Extra padding for the eye icon
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  eyeIconText: {
    fontSize: 20,
    color: '#7f8c8d',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
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
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#7f8c8d',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  toggleButton: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default LoginScreen; 