// import messaging from '@react-native-firebase/messaging';

// Init FCM and handle token
// Stubbed for build fix
async function handleFCMToken() {
    /*
    try {
      // Request permissions
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  
      if (enabled) {
        // Get token
        const token = await messaging().getToken();
        console.log("FCM Token : " + token);
        
        // If token refresh
        messaging().onTokenRefresh(token => {
          console.log("FCM Token refreshed : " + token);
        });
      }
    } catch (error) {
      // console.log("Error handling FCM token:", error);
    }
    */
    console.log("FCM Stubbed");
}

export { handleFCMToken };