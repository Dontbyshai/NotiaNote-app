import mobileAds, { AdsConsent, MaxAdContentRating, RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType, TestIds, RewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

const REWARDED_IDS = Platform.select({
  ios: {
    appreciation: 'ca-app-pub-5759305174337781/8706909691',
    create_note: 'ca-app-pub-5759305174337781/8076354303',
    general_1: 'ca-app-pub-5759305174337781/9758963459',
    general_2: 'ca-app-pub-5759305174337781/9389435971',
    graph: 'ca-app-pub-5759305174337781/3792320908',
  },
  android: {
    appreciation: 'ca-app-pub-5759305174337781/9577198304', // Intersistiel recomence apparence
    create_note: 'ca-app-pub-5759305174337781/7226367131',  // Intersistiel recomence Moyen cree not
    general_1: 'ca-app-pub-5759305174337781/5912886087',    // Intersistiel recomence Moyen genral
    general_2: 'ca-app-pub-5759305174337781/6320479574',    // Intersistiel recomence Moyen genral ...
    graph: 'ca-app-pub-5759305174337781/4599804411',        // Intersistiel recomence Note graphique
  }
});

const INTERSTITIAL_IDS = Platform.select({
  ios: {
    message: 'ca-app-pub-5759305174337781/5105402579',
    schoollife: 'ca-app-pub-5759305174337781/4394956134',
  },
  android: {
    message: 'ca-app-pub-5759305174337781/5595329494',     // intersisiel message
    schoollife: 'ca-app-pub-5759305174337781/1973641075',  // Intersistiel vie scolaire
  }
});

class AdsHandler {
  static servePersonalizedAds = false;
  static canServeAds = false;

  /**
   * Main setup function to be called at app startup
   */
  static async setupAdmob({ checkForConsent = true, setCanServeAds, setIsAdsHandlerLoaded }) {
    try {
      console.log("[Ads] Starting setup...");

      // 1. Handle GDPR/UMP Consent First (Apple requirement: Show GDPR before ATT)
      if (checkForConsent) {
        try {
          const consentInfo = await AdsConsent.requestInfoUpdate();

          if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
            const result = await AdsConsent.showForm();
            console.log("[Ads] UMP Form shown, result:", result);
          }
        } catch (consentError) {
          console.warn("[Ads] Consent info update failed (likely no form configured), continuing...", consentError);
        }
      }

      // 2. Check ATT on iOS Second
      if (Platform.OS === 'ios') {
        await this.checkATTConsent();
      }

      // 3. Initialize SDK
      await this.initAds();

      this.canServeAds = true;
      if (setCanServeAds) setCanServeAds(true);
      if (setIsAdsHandlerLoaded) setIsAdsHandlerLoaded(true);

      console.log("[Ads] Setup complete.");
    } catch (error) {
      console.error("[Ads] Setup failed:", error);
      // Allow trying to serve ads anyway, SDK might handle it or recover
      this.canServeAds = true;
      if (setCanServeAds) setCanServeAds(true);
      if (setIsAdsHandlerLoaded) setIsAdsHandlerLoaded(true);
    }
  }

  static async initAds() {
    await mobileAds().initialize();
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
  }

  static async checkATTConsent() {
    if (Platform.OS !== 'ios') return true;

    const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    if (status === RESULTS.DENIED) {
      const newStatus = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
      return newStatus === RESULTS.GRANTED;
    }
    return status === RESULTS.GRANTED;
  }

  static async resetAdChoices() {
    await AdsConsent.reset();
  }

  static async openDebugger() {
    await mobileAds().openAdInspector();
  }

  static async showRewardedAd(onReward, onClosed, placement = 'create_note') {
    console.log(`[Ads] Loading Rewarded Ad (${placement})...`);

    // Safety Timeout mechanism (2.5 seconds)
    let isHandled = false;
    let timeoutId = null;

    const safeReward = () => {
      if (isHandled) return;
      isHandled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (onReward) onReward();
    };

    const safeClose = () => {
      if (isHandled) return; // If already rewarded via timeout, don't trigger close logic that might conflict
      // Actually for close, we might still want to call it if the user manually closes the ad.
      // But if timeout passed, we already opened the modal.
      // Let's keep it simple: if timeout happened, we ignore subsequent ad events.
      if (isHandled) return;
      isHandled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (onClosed) onClosed();
    };

    // Most of your new ones are "Interstitial avec récompense"
    const adUnitId = __DEV__ ? TestIds.REWARDED_INTERSTITIAL : (REWARDED_IDS[placement] || 'ca-app-pub-5759305174337781/6216477728');

    const rewarded = RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: !this.servePersonalizedAds,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (isHandled) return; // Timeout won
      console.log("[Ads] Rewarded Ad Loaded, showing...");
      if (timeoutId) clearTimeout(timeoutId); // Ad is here, cancel timeout
      rewarded.show();
    });

    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log("[Ads] User earned reward:", reward);
      safeReward();
    });

    const unsubscribeClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      console.log("[Ads] Ad Closed");
      safeClose();
      cleanup();
    });

    const unsubscribeError = rewarded.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
      console.warn(`[Ads] Rewarded Ad (${placement}) failed to load/show:`, error);
      // Fallback: grant reward (or just close) so user isn't stuck
      safeReward();
      cleanup();
    });

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };

    // Start strict timeout
    timeoutId = setTimeout(() => {
      console.warn("[Ads] Timeout reached (2500ms). Bypassing ad.");
      safeReward(); // Auto-grant reward so feature opens
      cleanup(); // Cleanup listeners
    }, 2500);

    try {
      rewarded.load();
    } catch (e) {
      console.warn("[Ads] Synchronous load error:", e);
      safeReward();
      cleanup();
    }
  }

  static async showInterstitialAd(onClosed, placement = 'message') {
    console.log(`[Ads] Loading Interstitial Ad (${placement})...`);

    const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : (INTERSTITIAL_IDS[placement] || 'ca-app-pub-5759305174337781/6024906033');

    const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: !this.servePersonalizedAds,
    });

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log("[Ads] Interstitial Loaded, showing...");
      interstitial.show();
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log("[Ads] Interstitial Closed");
      if (onClosed) onClosed();
      unsubscribeLoaded();
      unsubscribeClosed();
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn(`[Ads] Interstitial (${placement}) failed to load/show:`, error);
      // Fallback: just proceed to the content
      if (onClosed) onClosed();

      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    });

    try {
      interstitial.load();
    } catch (e) {
      console.warn("[Ads] Synchronous interstitial load error:", e);
      if (onClosed) onClosed();
    }
  }
}

export default AdsHandler;