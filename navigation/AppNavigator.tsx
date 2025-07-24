import React from 'react';
import { View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import CustomHeader from '../components/CustomHeader';

const Drawer = createDrawerNavigator();

// Import your screens here
import HomeScreen from '../screens/HomeScreen';
import AnalysisResultsScreen from '../screens/AnalysisResultsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const AppNavigator = () => {
  const { t } = useTranslation();
  
  const SafeAreaHeader = () => {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ paddingTop: insets.top, backgroundColor: '#f8f9fa' }}>
        <CustomHeader />
      </View>
    );
  };

  return (
    <Drawer.Navigator
      initialRouteName="Home"
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

export default AppNavigator; 