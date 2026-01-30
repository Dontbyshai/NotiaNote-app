import { useEffect } from "react";
import useState from "react-usestateref";
import { StatusBar, useColorScheme, View, ActivityIndicator, Text } from "react-native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

import AuthStack from "./auth/AuthStack";
import AppStack from "./app/AppStack";
import { Themes, initFontsAndThemes } from "../util/Styles";
import { GlobalAppContextProvider, useGlobalAppContext } from "../util/GlobalAppContext";
// // import { initFirebaseAppCheck } from "../util/firebase/firebaseAppCheck";
// import { setupNotifications } from "../util/firebase/firebaseCloudMessaging";
import AdsHandler from "../core/AdsHandler";
import ColorsHandler from "../core/ColorsHandler";
import CoefficientHandler from "../core/CoefficientHandler";
import AccountHandler from "../core/AccountHandler";
import StorageHandler from "../core/StorageHandler";
import BiometricLock from "./components/BiometricLock";


// App Root
function AppRoot() {
  console.log("[AppRoot] Component rendering START");
  // Close SplashScreen once app is loaded
  const [isLoaded, setIsLoaded, isLoadedRef] = useState(false);
  useEffect(() => { if (isLoadedRef.current) { SplashScreen.hideAsync(); } }, [isLoadedRef.current]);

  // Is user logged-in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cameFromAuthStack, setCameFromAuthStack] = useState(false);

  // Theme
  const [theme, setTheme] = useState(null);
  const [isAutoTheme, setIsAutoTheme] = useState(false); // Default FALSE to force Violet

  // Context
  const [canServeAds, setCanServeAds] = useState(false);
  const [isAdsHandlerLoaded, setIsAdsHandlerLoaded] = useState(false);

  // Security
  const [isLocked, setIsLocked] = useState(false);

  // Prepare function
  useEffect(() => {
    console.log("(AppRoot) useEffect prepare triggered");
    prepare();
  }, []);
  async function prepare() {
    try {
      console.log("(AppRoot) Starting preparation...");

      // Load UI
      console.log("(AppRoot) Loading fonts and themes...");
      try {
        await initFontsAndThemes();
      } catch (fontError) {
        console.warn("(AppRoot) Font loading failed, continuing anyway:", fontError);
      }

      console.log("(AppRoot) Getting theme data...");
      const themeData = await StorageHandler.getData("theme");
      if (themeData) {
        setIsAutoTheme(themeData.isAutoTheme);

        // Support named themes (BleuOcean, etc.) or legacy "dark"/"light"
        const savedId = themeData.savedTheme;
        if (Themes[savedId]) {
          setTheme(Themes[savedId]);
        } else {
          // Fallback legacy
          setTheme(savedId == "light" ? Themes.LightTheme : Themes.DarkTheme);
        }
      } else {
        setIsAutoTheme(false);
        setTheme(Themes.DarkTheme); // Violet Cosmique
      }

      // Check if logged-in
      console.log("(AppRoot) Checking credentials...");
      const credentialsExist = await StorageHandler.dataExists("credentials");
      // TEMPORAIRE: Désactiver l'auto-login pour les tests
      if (credentialsExist) {
        setIsLoggedIn(true);
        // if (false) { // Force false pour tester

        console.log("(AppRoot) Loading user data handlers...");
        await ColorsHandler.load();
        await CoefficientHandler.load();

        // Check for biometric lock
        const bioAuthEnabled = await AccountHandler.getPreference("security_bio_auth", false);
        if (bioAuthEnabled) {
          console.log("(AppRoot) Biometric Lock is ACTIVE.");
          setIsLocked(true);
        }

        // Setup AdMob (non-blocking)
        try {
          await AdsHandler.setupAdmob({ checkForConsent: true, setCanServeAds: setCanServeAds, setIsAdsHandlerLoaded: setIsAdsHandlerLoaded });
        } catch (adError) {
          console.warn("(AppRoot) AdMob setup failed, continuing without ads:", adError);
        }
      } else {
        // Setup AdMob (non-blocking)
        try {
          await AdsHandler.setupAdmob({ checkForConsent: false, setCanServeAds: setCanServeAds, setIsAdsHandlerLoaded: setIsAdsHandlerLoaded });
        } catch (adError) {
          console.warn("(AppRoot) AdMob setup failed, continuing without ads:", adError);
        }
      }

      console.log("(AppRoot) Preparation complete.");
      setIsLoaded(true);
    } catch (e) {
      console.error("(AppRoot) Error during preparation:", e);
      // Force load so we don't get stuck on splash screen
      setTheme(Themes.DarkTheme); // Fallback
      setIsLoaded(true);
    }
  }

  // Failsafe timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoadedRef.current) {
        console.warn("(AppRoot) Preparation timed out, forcing load.");
        setIsLoaded(true);
      }
    }, 10000); // 10 seconds
    return () => clearTimeout(timeout);
  }, []);

  if (!isLoaded) {
    console.log("[AppRoot] Still loading, showing spinner...");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2E1065' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }
  console.log("[AppRoot] Loaded! Rendering GlobalAppContextProvider");
  return (
    <GlobalAppContextProvider
      loggedIn={isLoggedIn}
      autoTheme={isAutoTheme}
      savedTheme={theme}
      _canServeAds={canServeAds}
      _isAdsHandlerLoaded={isAdsHandlerLoaded}
    >
      <GlobalStack
        cameFromAuthStack={cameFromAuthStack}
        setCameFromAuthStack={setCameFromAuthStack}
        isLocked={isLocked}
        setIsLocked={setIsLocked}
      />
    </GlobalAppContextProvider>
  );
}

// Global stack
const Stack = createNativeStackNavigator();
function GlobalStack({ cameFromAuthStack, setCameFromAuthStack, isLocked, setIsLocked }) {
  const { theme, changeTheme, isAutoTheme, isLoggedIn } = useGlobalAppContext();
  console.log("(GlobalStack) Rendering, theme:", theme?.dark ? 'Dark' : 'Light', "isLoggedIn:", isLoggedIn);

  if (!theme) {
    console.warn("(GlobalStack) Theme is NULL, rendering emergency fallback.");
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Create Navigation Theme mapping our internal theme to React Navigation's expected format
  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background, // This fixes the white flash!
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.surfaceOutline,
    },
  };

  // Auto-change theme
  const colorScheme = useColorScheme();
  useEffect(() => {
    if (isAutoTheme) {
      if (colorScheme == "dark") { changeTheme(Themes.DarkTheme); }
      else { changeTheme(Themes.LightTheme); }
    }
  }, [colorScheme, isAutoTheme]);

  // Double auth popup logic handled once Navigator is ready
  if (isLocked) {
    return <BiometricLock theme={theme} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle={theme.dark ? "light-content" : "dark-content"}
      />
      <NavigationReadyHandler />
      <Stack.Navigator>
        <Stack.Screen
          name="GlobalStack"
          options={{ headerShown: false }}
          initialParams={{ needToRefresh: false }}
        >
          {(props) => isLoggedIn ? (
            <AppStack cameFromAuthStack={cameFromAuthStack} {...props} />
          ) : (
            <AuthStack setCameFromAuthStack={setCameFromAuthStack} {...props} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Helper to handle navigation-dependent logic once container is ready
function NavigationReadyHandler() {
  const navigation = useNavigation();
  useEffect(() => {
    AccountHandler.openDoubleAuthPopup = () => navigation.navigate("DoubleAuthPopup");
    if (AccountHandler.wantToOpenDoubleAuthPopup) {
      AccountHandler.openDoubleAuthPopup();
      AccountHandler.wantToOpenDoubleAuthPopup = false;
    }
  }, []);
  return null;
}

export default AppRoot;