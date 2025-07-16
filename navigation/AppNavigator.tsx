import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';

const Drawer = createDrawerNavigator();

// Import your screens here
import HomeScreen from '../screens/HomeScreen';
import AnalysisResultScreen from '../screens/AnalysisResultScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const AppNavigator = () => {
  const SafeAreaHeader = () => {
    const insets = useSafeAreaInsets();
    return (
      <View style={{ paddingTop: insets.top, backgroundColor: '#f8f9fa' }}>
        <CustomHeader />
      </View>
    );
  };

  return (
    <NavigationContainer>
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
            drawerLabel: '🏠 Home',
          }}
        />
        <Drawer.Screen 
          name="AnalysisResult" 
          component={AnalysisResultScreen}
          options={{
            drawerLabel: '📊 Analysis Results',
          }}
        />
        <Drawer.Screen 
          name="History" 
          component={HistoryScreen}
          options={{
            drawerLabel: '📋 History',
          }}
        />
        <Drawer.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            drawerLabel: '⚙️ Settings',
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 