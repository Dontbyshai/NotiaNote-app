import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ShieldCheckIcon, FingerprintIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function BiometricLock({ onUnlock, theme }) {
    const triggerAuth = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                // Should not happen if UI allowed enabling it, but fallback
                onUnlock();
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authentification requise',
                fallbackLabel: 'Utiliser le code',
                cancelLabel: 'Annuler',
                disableDeviceFallback: false,
            });

            if (result.success) {
                onUnlock();
            }
        } catch (e) {
            console.error("Biometric Auth Error:", e);
            // In case of error, we might want to allow fallback or stay locked
            // For now, let's just stay locked and show a retry button
        }
    };

    useEffect(() => {
        triggerAuth();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                    <ShieldCheckIcon size={64} color={theme.colors.primary} />
                </View>

                <Text style={[styles.title, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>
                    NotiaNote Verrouillé
                </Text>
                <Text style={styles.subtitle}>
                    Authentifiez-vous pour accéder à vos notes
                </Text>

                <TouchableOpacity
                    onPress={triggerAuth}
                    style={[styles.button, { backgroundColor: theme.colors.primary }]}
                >
                    <FingerprintIcon size={24} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.buttonText}>Déverrouiller</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 40,
        width: '100%',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 40,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
