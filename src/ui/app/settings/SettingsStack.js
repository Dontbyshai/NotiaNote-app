import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SettingsPage from './SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import CoefficientsPage from './pages/CoefficientsPage';
import AdvancedSettingsPage from './pages/AdvancedSettingsPage';
import AdsInformationPage from './pages/AdsInformationPage';
import BugReportPage from './pages/BugReportPage';
import AppearancePage from './pages/AppearancePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotificationsPage from './pages/NotificationsPage';
import SecurityPrivacyPage from './pages/SecurityPrivacyPage';


// Create stack for navigation
const Stack = createNativeStackNavigator();

// Settings page stack
function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SettingsPage"
        component={SettingsPage}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />

      {/* Profile page */}
      <Stack.Screen
        name="ProfilePage"
        component={ProfilePage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Coefficients page */}
      <Stack.Screen
        name="CoefficientsPage"
        component={CoefficientsPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Advanced settings page */}
      <Stack.Screen
        name="AdvancedSettingsPage"
        component={AdvancedSettingsPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Ads information page */}
      <Stack.Screen
        name="AdsInformationPage"
        component={AdsInformationPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Bug reporting page */}
      <Stack.Screen
        name="BugReportPage"
        component={BugReportPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      {/* Appearance page */}
      <Stack.Screen
        name="AppearancePage"
        component={AppearancePage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Privacy Policy page */}
      <Stack.Screen
        name="PrivacyPolicyPage"
        component={PrivacyPolicyPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* About page */}
      <Stack.Screen
        name="AboutPage"
        component={AboutPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Contact page */}
      <Stack.Screen
        name="ContactPage"
        component={ContactPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Notifications page */}
      <Stack.Screen
        name="NotificationsPage"
        component={NotificationsPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />

      {/* Security & Privacy page */}
      <Stack.Screen
        name="SecurityPrivacyPage"
        component={SecurityPrivacyPage}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}

export default SettingsStack;