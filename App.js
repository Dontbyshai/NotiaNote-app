import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { LogBox, Platform } from "react-native";
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

import AppRoot from "./src/ui/AppRoot";

// Keep SplashScreen
SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

// Ignore Expo Go Notifications warning (SDK 53+)
LogBox.ignoreLogs([
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
]);

import { registerBackgroundFetchAsync } from './src/core/BackgroundTasks';
import './src/core/NotificationHandler'; // Init Notification Handler

// if (Platform.OS === 'android') {
//   try {
//     require('./src/widgets/widget-task-handler');
//     console.log("[App] Widget task handler registered.");
//   } catch (e) {
//     console.error("[App] Failed to register widget task handler:", e);
//   }
// }

// Init background fetch once
registerBackgroundFetchAsync();

// Main app
function App() {
  console.log("[App] Rendering root component...");
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppRoot />
    </GestureHandlerRootView>
  );
}

export default App;
