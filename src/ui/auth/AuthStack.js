import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from "./WelcomeScreen";
import LoginPage from "./LoginPage";
import ChooseAccountPage from './ChooseAccountPage';
import DoubleAuthPopup from '../components/DoubleAuthPopup';


// Create stack for navigation
const Stack = createNativeStackNavigator();

// Stack shown when not logged-in
function AuthStack({ setCameFromAuthStack }) {
  useEffect(() => { setCameFromAuthStack(true); }, []);

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WelcomeScreen"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LoginPage"
        component={LoginPage}
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="ChooseAccountPage"
        component={ChooseAccountPage}
        options={{
          presentation: 'containedModal',
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      />

      {/* Double auth popup */}
      <Stack.Screen
        name="DoubleAuthPopup"
        component={DoubleAuthPopup}
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'fade_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default AuthStack;