import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createDrawerNavigator, DrawerItemList } from '@react-navigation/drawer';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import CustomHeader from '../components/CustomHeader';

const Drawer = createDrawerNavigator();

// Import your screens here
import HomeScreen from '../screens/HomeScreen';
import AnalysisResultsScreen from '../screens/AnalysisResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const AppNavigator = () => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  
  const SafeAreaHeader = () => {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ paddingTop: insets.top, backgroundColor: '#f8f9fa' }}>
        <CustomHeader />
      </View>
    );
  };

  // Custom drawer content with Logout button at the bottom
  // This preserves all default menu items (Home, Analysis, Settings) and adds Logout at the bottom
  // SafeAreaView ensures proper spacing on devices with notches
  const CustomDrawerContent = (props: any) => {
    const insets = useSafeAreaInsets();
    
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
      <SafeAreaView style={styles.drawerContainer} edges={['top']}>
        {/* Add top padding to respect safe area on devices with notches */}
        <View style={[styles.drawerContent, { paddingTop: insets.top }]}>
          <DrawerItemList {...props} />
        </View>
        
        {/* Visual separator above Logout button */}
        <View style={styles.separator} />
        
        {/* Logout button at the bottom with visual separator */}
        <View style={[styles.logoutContainer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>🚪 {t('settingsScreen.logout')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        header: () => <SafeAreaHeader />,
        drawerStyle: {
          backgroundColor: '#ffffff',
          width: 280,
        },
        drawerActiveTintColor: '#2c3e50',
        drawerInactiveTintColor: '#7f8c8d',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          drawerLabel: `🏠 ${t('home')}`,
        }}
      />
      <Drawer.Screen 
        name="AnalysisResults" 
        component={AnalysisResultsScreen}
        options={{
          drawerLabel: `📊 ${t('analysis_results')}`,
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          drawerLabel: `⚙️ ${t('settings')}`,
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  drawerContent: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
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
});

export default AppNavigator; 