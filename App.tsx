import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent={false} />
      <AppNavigator />
    </>
  );
}
