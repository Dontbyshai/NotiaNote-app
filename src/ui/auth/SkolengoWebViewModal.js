import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { School, ChallengeMethod } from 'skolengojs';
import { SkolengoDriver } from '../../core/drivers/SkolengoDriver';

export default function SkolengoWebViewModal({ schoolData, onClose, onSuccess }) {
    const [loginURL, setLoginURL] = useState(null);
    const flowRef = useRef(null);
    const schoolObjRef = useRef(null);

    useEffect(() => {
        const initSkolengoLogin = async () => {
            try {
                // Initialize the Skolengo School object
                const school = new School(
                    schoolData.id,
                    schoolData.name,
                    schoolData.emsCode,
                    schoolData.OIDCWellKnown || schoolData.ref?.OIDCWellKnown,
                    schoolData.location || schoolData.ref?.location,
                    schoolData.homepage || schoolData.ref?.homepage
                );
                schoolObjRef.current = school;

                // Start OAuth flow
                const flow = await school.initializeLogin(ChallengeMethod.PLAIN);
                flowRef.current = flow;
                setLoginURL(flow.loginURL);
            } catch (error) {
                console.error("Skolengo init error:", error);
                Alert.alert("Erreur", "Impossible d'initialiser la connexion avec cet établissement. " + error.message);
                onClose();
            }
        };

        if (schoolData) {
            console.log("Skolengo initializing with school: ", schoolData.name);
            initSkolengoLogin();
        } else {
            console.log("No school data provided to Skolengo modal");
        }
    }, [schoolData]);

    console.log("Skolengo Modal Current state loginURL:", loginURL);

    const handleNavigationStateChange = async (navState) => {
        const url = typeof navState === 'string' ? navState : navState.url;
        if (url && url.startsWith("skoapp-prod://")) {
            // We caught the OAuth redirect!
            try {
                const codeMatch = url.match(/code=([^&]*)/);
                const stateMatch = url.match(/state=([^&]*)/);

                if (codeMatch && stateMatch && flowRef.current) {
                    const auth = await flowRef.current.finalizeLogin(codeMatch[1], stateMatch[1]);

                    const status = await SkolengoDriver.loginWithOAuth(
                        auth,
                        schoolData.name,
                        flowRef.current.school.emsCode,
                        flowRef.current.endpoints.tokenEndpoint
                    );

                    if (status === 1) {
                        onSuccess();
                    } else {
                        throw new Error("Save error");
                    }
                } else {
                    throw new Error("Missing code or state");
                }
            } catch (error) {
                console.error("Skolengo Finalize Error:", error);
                Alert.alert("Erreur", "La connexion Skolengo a échouée.");
            }
            return false; // Prevent Webview from trying to load skoapp-prod link
        }
        return true;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <X color="#FFF" size={24} />
                </TouchableOpacity>
            </View>

            {!loginURL ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#A855F7" />
                </View>
            ) : (
                <WebView
                    source={{ uri: loginURL }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onShouldStartLoadWithRequest={(request) => {
                        const shouldLoad = handleNavigationStateChange(request.url);
                        // React Native WebView REQUIRES a boolean true to continue loading
                        return shouldLoad !== false;
                    }}
                    style={{ flex: 1, backgroundColor: '#FFF' }}
                    userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100 Mobile Safari/537.36"
                    incognito={true}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A', paddingTop: 50 },
    header: { height: 50, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 },
    closeBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
