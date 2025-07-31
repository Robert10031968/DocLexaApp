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
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { t } = useTranslation();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('alerts.error'), t('login.pleaseFillAllFields'));
      return;
    }

    setLoading(true);
    
    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        Alert.alert(t('alerts.error'), error.message);
      } else if (isSignUp) {
        Alert.alert(
          t('login.signUp'), 
          t('login.checkEmailToConfirm'),
          [{ text: t('login.ok') }]
        );
      }
    } catch (error) {
      Alert.alert(t('alerts.error'), t('login.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        Alert.alert(
          t('login.googleSignInFailed'), 
          error.message || t('login.unableToSignInWithGoogle'),
          [{ text: t('login.ok') }]
        );
      }
    } catch (error) {
      Alert.alert(
        t('alerts.error'), 
        t('login.unexpectedErrorDuringGoogleSignIn'),
        [{ text: t('login.ok') }]
      );
    } finally {
      setGoogleLoading(false);
    }
  };



  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('alerts.error'), t('login.pleaseEnterEmail'));
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        Alert.alert(t('alerts.error'), error.message);
      } else {
        Alert.alert(
          t('login.resetPassword'), 
          t('login.passwordResetSent'),
          [{ text: t('login.ok') }]
        );
        setForgotPassword(false);
      }
    } catch (error) {
      Alert.alert(t('alerts.error'), t('login.unexpectedError'));
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
            <Image 
              source={require('../assets/Doclexa.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>
              {isSignUp ? t('login.signUp') : t('login.signIn')}
            </Text>
          </View>

          {/* Auth Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('login.email')}
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
                  placeholder={t('login.password')}
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
                <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
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
                    ? t('login.resetPassword')
                    : isSignUp 
                      ? t('login.signUp')
                      : t('login.signIn')
                  }
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            {!forgotPassword && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>{t('login.or')}</Text>
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
                    <Text style={styles.googleButtonText}>{t('login.signInWithGoogle')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}


          </View>

                      {/* Toggle between Sign In/Sign Up */}
            {!forgotPassword && (
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleText}>
                  {isSignUp ? t('login.alreadyHaveAccount') : t('login.dontHaveAccount')}
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
                    {isSignUp ? t('login.signInHere') : t('login.signUpHere')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
                <Text style={styles.toggleButton}>{t('login.signInHere')}</Text>
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
    paddingTop: 20,
  },
  logo: {
    width: 200,
    height: 120,
    marginBottom: 24,
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