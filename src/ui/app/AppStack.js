import { useEffect, useState, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainStack from './MainStack';
import SettingsStack from './settings/SettingsStack';
import DoubleAuthPopup from '../components/DoubleAuthPopup';
import AccountHandler from '../../core/AccountHandler';
import MarksHandler from '../../core/MarksHandler';
import HomeworkHandler from '../../core/HomeworkHandler';
import HapticsHandler from '../../core/HapticsHandler';
import { CurrentAccountContextProvider } from '../../util/CurrentAccountContext';
import { AppStackContextProvider, useAppStackContext } from '../../util/AppStackContext';

import StorageHandler from '../../core/StorageHandler';


// Onboarding
// Onboarding
import OnboardingWelcomePage from '../onboarding/post-login/OnboardingWelcomePage';
import OnboardingThemePage from '../onboarding/post-login/OnboardingThemePage';
import OnboardingColorsPage from '../onboarding/post-login/OnboardingColorsPage';
import OnboardingDataPage from '../onboarding/post-login/OnboardingDataPage';

import ColorsHandler from '../../core/ColorsHandler';
import OfflineBanner from '../components/OfflineBanner';

// Create stack for navigation
const Stack = createNativeStackNavigator();


// Stack shown when logged-in
function AppStack({ route, cameFromAuthStack }) {
  const { needToRefresh } = route.params;

  return (
    <AppStackContextProvider
      needToRefresh={needToRefresh}
      cameFromAuthStack={cameFromAuthStack}
    >
      <OfflineBanner />
      <MainAndSettingsStack cameFromAuthStack={cameFromAuthStack} />
    </AppStackContextProvider>
  );
}

function MainAndSettingsStack({ cameFromAuthStack }) {
  const { refreshLogin, isConnected, isConnecting, updateGlobalDisplay } = useAppStackContext();

  // Onboarding Logic
  const [isOnboardingChecked, setIsOnboardingChecked] = useState(false);
  const [initialRoute, setInitialRoute] = useState("MainStack");

  useEffect(() => {
    async function checkOnboarding() {
      // Only check if we just logged in (cameFromAuthStack)
      console.log(`[AppStack] Checking onboarding. CameFromAuthStack: ${cameFromAuthStack}`);
      if (cameFromAuthStack) {
        const completed = await StorageHandler.getData("hasCompletedOnboarding");
        console.log(`[AppStack] Has completed onboarding: ${completed}`);
        if (!completed) {
          console.log("[AppStack] Onboarding not completed, redirecting...");
          setInitialRoute("OnboardingWelcomePage");
        }
      }
      setIsOnboardingChecked(true);
    }
    checkOnboarding();
  }, []);

  // Listen for color changes globally to update dependent views
  useEffect(() => {
    const update = () => updateGlobalDisplay();
    ColorsHandler.addListener(update);
    return () => ColorsHandler.removeListener(update);
  }, []);

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [mainAccount, setMainAccount] = useState({ "accountType": "E" });
  function updateMainAccount() { AccountHandler.getMainAccount().then(account => { if (account) { setMainAccount(account); } }); }
  useEffect(() => { updateMainAccount(); }, []); // Call on mount
  useEffect(() => { updateMainAccount(); }, [isConnected]); // Call when connection changes

  // Select a student account to get marks from
  const [showMarksAccount, setShowMarksAccount] = useState({});
  useEffect(() => {
    const setup = async () => {
      if (!mainAccount || !mainAccount.id) return;

      if (mainAccount.accountType === "E") {
        await AccountHandler.setSelectedChildAccount(mainAccount.id);
        setShowMarksAccount(mainAccount);
      } else if (mainAccount.children && Object.keys(mainAccount.children).length > 0) {
        const childrenKeys = Object.keys(mainAccount.children);
        await AccountHandler.setSelectedChildAccount(childrenKeys[0]);
        setShowMarksAccount(mainAccount.children[childrenKeys[0]]);
      }
    };
    setup();
  }, [mainAccount.id]); // specifically watch mainAccount.id

  // Marks — pure refs for tracking (never displayed directly, only used as guards)
  const gotMarksForIDRef = useRef({});
  const gettingMarksForIDRef = useRef({});
  const errorGettingMarksForIDRef = useRef({});

  // Homework — same pattern
  const gotHomeworkForIDRef = useRef({});
  const gettingHomeworkForIDRef = useRef({});
  const errorGettingHomeworkForIDRef = useRef({});

  // Auto-get marks and homework for each connected account
  async function getMarks(accountID, manualRefreshing) {
    if (gotMarksForIDRef.current[accountID] && !manualRefreshing) { return; }
    if (gettingMarksForIDRef.current[accountID]) { return; }

    gettingMarksForIDRef.current = { ...gettingMarksForIDRef.current, [accountID]: true };
    const status = await MarksHandler.getMarks(accountID);
    gotMarksForIDRef.current[accountID] = status == 1;
    errorGettingMarksForIDRef.current[accountID] = status != 1;
    gettingMarksForIDRef.current = { ...gettingMarksForIDRef.current, [accountID]: false };
  }
  async function getHomework(accountID, manualRefreshing) {
    if (gotHomeworkForIDRef.current[accountID] && !manualRefreshing) { return; }
    if (gettingHomeworkForIDRef.current[accountID]) { return; }

    gettingHomeworkForIDRef.current = { ...gettingHomeworkForIDRef.current, [accountID]: true };
    const status = await HomeworkHandler.getAllHomework(accountID);
    gotHomeworkForIDRef.current[accountID] = status == 1;
    errorGettingHomeworkForIDRef.current[accountID] = status != 1;
    gettingHomeworkForIDRef.current = { ...gettingHomeworkForIDRef.current, [accountID]: false };
  }
  useEffect(() => {
    async function autoGetMarks() {
      // Check if not already got marks or is getting marks
      if (gettingMarksForIDRef.current[showMarksAccount.id] || gettingHomeworkForIDRef.current[showMarksAccount.id]) { return; }

      // Get marks & homework
      await Promise.all([
        getMarks(showMarksAccount.id, manualRefreshing),
        getHomework(showMarksAccount.id, manualRefreshing),
      ]);
      updateGlobalDisplay();
      if (manualRefreshing) {
        setManualRefreshing(false);
        HapticsHandler.vibrate("light");
      }
    }
    async function reloginAndGetMarks() {
      const reloginStatus = await refreshLogin();
      if (reloginStatus == 1) { autoGetMarks(); }
      else {
        setManualRefreshing(false);
        HapticsHandler.vibrate("light");
      }
    }
    if (isConnected && showMarksAccount.id) { autoGetMarks(); }
    else if (showMarksAccount.id && !isConnecting && manualRefreshing) { reloginAndGetMarks(); }
    else if (manualRefreshing) { setManualRefreshing(false); }
  }, [isConnected, showMarksAccount.id, manualRefreshing]);

  if (!isOnboardingChecked) {
    return null; // or a loading spinner
  }

  return (
    <CurrentAccountContextProvider
      // The account whose marks are displayed
      _accountID={showMarksAccount.id}
      setShowMarksAccount={setShowMarksAccount}

      // The ÉcoleDirecte account that is connected
      mainAccount={mainAccount}
      updateMainAccount={updateMainAccount}

      _gotMarks={gotMarksForIDRef.current[showMarksAccount.id]}
      _isGettingMarks={gettingMarksForIDRef.current[showMarksAccount.id]}
      _errorGettingMarks={errorGettingMarksForIDRef.current[showMarksAccount.id]}

      _gotHomework={gotHomeworkForIDRef.current[showMarksAccount.id]}
      _isGettingHomework={gettingHomeworkForIDRef.current[showMarksAccount.id]}
      _errorGettingHomework={errorGettingHomeworkForIDRef.current[showMarksAccount.id]}
      getHomework={getHomework}

      manualRefreshing={manualRefreshing} setManualRefreshing={setManualRefreshing}
    >
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="MainStack"
          component={MainStack}
          options={{ headerShown: false }}
          initialParams={{
            newAccountID: 0,
          }}
        />

        {/* Onboarding Stack */}
        <Stack.Screen
          name="OnboardingWelcomePage"
          component={OnboardingWelcomePage}
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="OnboardingThemePage"
          component={OnboardingThemePage}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="OnboardingColorsPage"
          component={OnboardingColorsPage}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="OnboardingDataPage"
          component={OnboardingDataPage}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />

        {/* Settings */}
        <Stack.Screen
          name="SettingsStack"
          component={SettingsStack}
          options={{
            headerShown: false,
            presentation: 'modal',
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
    </CurrentAccountContextProvider>
  );
}


export default AppStack;