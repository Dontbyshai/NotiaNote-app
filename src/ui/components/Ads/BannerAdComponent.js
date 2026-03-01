import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';

const AD_UNIT_IDS = Platform.select({
    ios: {
        home: 'ca-app-pub-5759305174337781/6272318046',
        cantine: 'ca-app-pub-5759305174337781/1253787474',
        homework: 'ca-app-pub-5759305174337781/5967301953',
        homework_detail: 'ca-app-pub-5759305174337781/3879950818',
        timetable: 'ca-app-pub-5759305174337781/2566869144',
        messages: 'ca-app-pub-5759305174337781/8637453473',
        marks: 'ca-app-pub-5759305174337781/6954844324',
        schoollife: 'ca-app-pub-5759305174337781/7731565916',
    },
    android: {
        home: 'ca-app-pub-5759305174337781/4472304803',
        cantine: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx', // TO REPLACE
        homework: 'ca-app-pub-5759305174337781/1592652613',
        homework_detail: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx', // TO REPLACE
        timetable: 'ca-app-pub-5759305174337781/8197771746',
        messages: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx', // TO REPLACE
        marks: 'ca-app-pub-5759305174337781/7041797587',
        schoollife: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx', // TO REPLACE
    }
});

const BannerAdComponent = ({ placement }) => {
    const { canServeAds } = useGlobalAppContext();
    const [adFailed, setAdFailed] = useState(false);

    if (adFailed || !canServeAds) return null;

    // Use test ID in dev, otherwise use the specific placement ID or the updated test/generic ID
    const adUnitId = __DEV__ ? TestIds.BANNER : (AD_UNIT_IDS[placement] || 'ca-app-pub-5759305174337781/9236219270');

    return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.BANNER}
                requestOptions={{
                    requestNonPersonalizedAdsOnly: true,
                }}
                onAdFailedToLoad={(error) => {
                    console.warn(`[AdBanner] (${placement}) Failed to load:`, error);
                    setAdFailed(true);
                }}
            />
        </View>
    );
};

export default BannerAdComponent;
