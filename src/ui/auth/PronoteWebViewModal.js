import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { PronoteDriver } from '../../core/drivers/PronoteDriver';

// Helper to generate UUID if not present
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function PronoteWebViewModal({ url, onClose, onSuccess }) {
    const webViewRef = useRef(null);
    const [deviceUUID] = useState(uuidv4());
    const [loading, setLoading] = useState(true);
    const [loginInProgress, setLoginInProgress] = useState(false);

    const infoMobileURL = url + "/InfoMobileApp.json?id=0D264427-EEFC-4810-A9E9-346942A862A4";

    const PRONOTE_COOKIE_EXPIRED = new Date(0).toUTCString();
    const PRONOTE_COOKIE_VALIDATION_EXPIRES = new Date(new Date().getTime() + 5 * 60 * 1000).toUTCString();
    const PRONOTE_COOKIE_LANGUAGE_EXPIRES = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000).toUTCString();

    const INJECT_PRONOTE_INITIAL_LOGIN_HOOK = `
      window.hookAccesDepuisAppli = function() {
        this.passerEnModeValidationAppliMobile('', '${deviceUUID}');
      };
      try {
            window.GInterface.passerEnModeValidationAppliMobile('', '${deviceUUID}', '', '', '{"model": "random", "platform": "android"}');
      } catch {}
    `;

    const INJECT_PRONOTE_JSON = `
      (function () {
        try {
          const json = JSON.parse(document.body.innerText);
          const lJetonCas = !!json && !!json.CAS && json.CAS.jetonCAS;
          document.cookie = "appliMobile=; expires=${PRONOTE_COOKIE_EXPIRED}";
          if (!!lJetonCas) {
            document.cookie = "validationAppliMobile=" + lJetonCas + "; expires=${PRONOTE_COOKIE_VALIDATION_EXPIRES}";
            document.cookie = "uuidAppliMobile=${deviceUUID}; expires=${PRONOTE_COOKIE_VALIDATION_EXPIRES}";
            document.cookie = "ielang=1036; expires=${PRONOTE_COOKIE_LANGUAGE_EXPIRES}";
          }
          window.location.assign("${url}/mobile.eleve.html?fd=1");
        } catch (error) {}
      })();
    `;

    const INJECT_PRONOTE_CURRENT_LOGIN_STATE = `
      (function () {
        setInterval(function() {
          const state = window && window.loginState ? window.loginState : void 0;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pronote.loginState',
            data: state
          }));
        }, 1000);
      })();
    `;

    const onMessage = async (event) => {
        if (loginInProgress) return;
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === "pronote.loginState" && message.data && message.data.status === 0) {
                setLoginInProgress(true);
                // Extract credentials
                const login = message.data.login;
                const mdp = message.data.mdp;

                const status = await PronoteDriver.loginWithToken(login, mdp, url, "", deviceUUID);
                if (status === 1) {
                    onSuccess();
                } else {
                    Alert.alert("Erreur", "Connexion à Pronote échouée.");
                    setLoginInProgress(false);
                }
            }
        } catch (e) { }
    };

    const onLoadEnd = (e) => {
        setLoading(false);
        const navUrl = e.nativeEvent.url;

        webViewRef.current?.injectJavaScript(INJECT_PRONOTE_INITIAL_LOGIN_HOOK);

        if (navUrl === infoMobileURL || navUrl.includes('InfoMobileApp.json')) {
            webViewRef.current?.injectJavaScript(INJECT_PRONOTE_JSON);
        } else if (navUrl.includes("mobile.eleve.html")) {
            webViewRef.current?.injectJavaScript(INJECT_PRONOTE_INITIAL_LOGIN_HOOK);
            webViewRef.current?.injectJavaScript(INJECT_PRONOTE_CURRENT_LOGIN_STATE);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <X color="#FFF" size={24} />
                </TouchableOpacity>
            </View>
            <WebView
                ref={webViewRef}
                source={{ uri: infoMobileURL }}
                onMessage={onMessage}
                onLoadEnd={onLoadEnd}
                userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100 Mobile Safari/537.36"
                style={{ flex: 1, backgroundColor: '#FFF' }}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
            />
            {(loading || loginInProgress) && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#A855F7" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 50 },
    header: { height: 50, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 },
    closeBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
