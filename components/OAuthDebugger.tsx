import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

const OAuthDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const getDebugInfo = async () => {
      const redirectUri = AuthSession.makeRedirectUri();
      const proxyRedirectUri = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      const recommendedRedirectUri = 'https://auth.expo.io/@rgoralczyk1003/doclexa';
      
              setDebugInfo({
          redirectUri,
          proxyRedirectUri,
          recommendedRedirectUri,
          expoGo: Constants.appOwnership === 'expo',
          bundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier,
          packageName: Constants.expoConfig?.android?.package,
          scheme: Constants.expoConfig?.scheme,
          owner: Constants.expoConfig?.owner,
          extra: Constants.expoConfig?.extra,
        });
    };

    getDebugInfo();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAuth Debug Information</Text>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.label}>Redirect URI:</Text>
        <Text style={styles.value}>{debugInfo.redirectUri}</Text>
        
        <Text style={styles.label}>Proxy Redirect URI:</Text>
        <Text style={styles.value}>{debugInfo.proxyRedirectUri}</Text>
        
        <Text style={styles.label}>Recommended Redirect URI:</Text>
        <Text style={styles.value}>{debugInfo.recommendedRedirectUri}</Text>
        
        <Text style={styles.label}>Running in Expo Go:</Text>
        <Text style={styles.value}>{debugInfo.expoGo ? 'Yes' : 'No'}</Text>
        
        <Text style={styles.label}>Bundle Identifier:</Text>
        <Text style={styles.value}>{debugInfo.bundleIdentifier}</Text>
        
        <Text style={styles.label}>Package Name:</Text>
        <Text style={styles.value}>{debugInfo.packageName}</Text>
        
        <Text style={styles.label}>Scheme:</Text>
        <Text style={styles.value}>{debugInfo.scheme}</Text>
        
        <Text style={styles.label}>Owner:</Text>
        <Text style={styles.value}>{debugInfo.owner}</Text>
        
        <Text style={styles.label}>Has Extra Config:</Text>
        <Text style={styles.value}>{debugInfo.extra ? 'Yes' : 'No'}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  value: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
});

export default OAuthDebugger; 