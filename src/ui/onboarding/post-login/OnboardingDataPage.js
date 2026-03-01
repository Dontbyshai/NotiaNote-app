import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, ArrowRight, ShieldCheck, Heart } from 'lucide-react-native';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import StorageHandler from '../../../core/StorageHandler';
import AccountHandler from '../../../core/AccountHandler';
import DiscordHandler from '../../../core/DiscordHandler';
import AdsHandler from '../../../core/AdsHandler';

const { width } = Dimensions.get('window');

export default function OnboardingDataPage({ navigation }) {
    const { theme } = useGlobalAppContext();
    const insets = useSafeAreaInsets();

    // Default to true for "opt-out" psychological effect, or false for privacy-first
    const [shareData, setShareData] = useState(true);

    const handleFinish = async () => {
        // Save preference (even if not used yet)
        await StorageHandler.saveData('opt_in_data_sharing', shareData);

        // Notify Discord (Non-blocking)
        try {
            const account = await AccountHandler.getMainAccount();
            DiscordHandler.sendNewUserAlert(account, shareData);
        } catch (e) {
            console.warn("Discord notification failed", e);
        }

        // Mark onboarding as complete!
        await StorageHandler.saveData('hasCompletedOnboarding', true);

        // TRIGGER GOOGLE CONSENT FORM (GDPR/IDFA)
        // This MUST happen before entering the app to ensure valid ad serving
        console.log("Triggering AdMob Consent Form...");
        await AdsHandler.setupAdmob({ checkForConsent: true });

        // Navigate to the main app (reset to ensure no back button)
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainStack' }],
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={{ flex: 1, paddingTop: insets.top + 45, paddingHorizontal: 24 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.stepIndicator}>
                        <Text style={styles.stepText}>Étape 3 sur 3</Text>
                    </View>
                    <View style={[styles.iconHeader, {
                        backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderColor: theme.colors.primary + '40', // 25% opacity check if this works, otherwise use rgba
                    }]}>
                        <Heart size={40} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.onBackground }]}>Aider NotiaNote</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onSurfaceDisabled }]}>
                        Contribue à l'amélioration de l'application en partageant des données anonymes.
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={[styles.card, {
                        backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                        borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                    }]}>
                        <View style={[styles.cardIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Share2 size={24} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.cardTitle, { color: theme.colors.onBackground }]}>Partage de données</Text>
                            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceDisabled }]}>
                                Ces données nous aident à corriger les bugs et améliorer les fonctionnalités.
                                Tout est 100% anonyme.
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: theme.colors.surfaceOutline, true: theme.colors.primary }}
                            thumbColor={shareData ? "#FFF" : "#E2E8F0"}
                            ios_backgroundColor={theme.colors.surfaceOutline}
                            onValueChange={setShareData}
                            value={shareData}
                        />
                    </View>

                    <View style={[styles.infoRow, { backgroundColor: theme.colors.success + '15' }]}>
                        <ShieldCheck size={20} color={theme.colors.success} style={{ marginRight: 10 }} />
                        <Text style={[styles.infoText, { color: theme.colors.success }]}>Vos identifiants ne quittent jamais votre appareil.</Text>
                    </View>
                </View>

                {/* Footer Button */}
                <View style={{ paddingBottom: insets.bottom + 20 }}>
                    <TouchableOpacity
                        style={[styles.button, { shadowColor: theme.colors.primary }]}
                        onPress={handleFinish}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.primary]} // Solid color for consistency
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>C'est parti !</Text>
                            <ArrowRight size={20} color={theme.colors.onPrimary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    stepIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        marginBottom: 20,
    },
    stepText: {
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Text-Bold',
        letterSpacing: 1,
    },
    iconHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Text-Bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Text-Medium',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 30,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Text-Bold',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 13,
        fontFamily: 'Text-Medium',
        lineHeight: 18,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 13,
        fontFamily: 'Text-Bold',
    },
    button: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Text-Bold',
    },
});
