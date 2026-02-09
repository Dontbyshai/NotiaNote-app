import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import AccountHandler from '../../../core/AccountHandler';

const { width } = Dimensions.get('window');

export default function OnboardingWelcomePage({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme } = useGlobalAppContext();
    const [firstName, setFirstName] = useState("");

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Load user name
        const loadName = async () => {
            const account = await AccountHandler.getMainAccount();
            if (account && account.prenom) {
                setFirstName(account.prenom);
            }
        };
        loadName();

        // Start animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleNext = () => {
        navigation.navigate('OnboardingThemePage');
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Background Gradient */}
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>

                {/* Main Content */}
                <Animated.View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    <View style={[styles.iconContainer, { borderColor: theme.colors.primary + '40', backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <Sparkles size={48} color={theme.colors.primary} />
                    </View>

                    <Text style={[styles.welcomeText, { color: theme.colors.onSurfaceDisabled }]}>👋 BIENVENUE SUR NOTIANOTE</Text>

                    <Text style={[styles.nameText, { color: theme.colors.onBackground }]}>
                        {firstName ? `${firstName} !` : " !"}
                    </Text>

                    <Text style={[styles.description, { color: theme.colors.onSurfaceDisabled }]}>
                        L'application conçue pour vous simplifier la vie scolaire, avec style. ✨
                    </Text>

                    <View style={[styles.divider, { backgroundColor: theme.colors.primary + '20' }]} />

                    <Text style={[styles.subDescription, { color: theme.colors.onSurface }]}>
                        Prenons un instant pour personnaliser votre expérience. 🎨
                    </Text>

                </Animated.View>

                {/* Footer Button */}
                <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                    <TouchableOpacity
                        style={[styles.button, { shadowColor: theme.colors.primary }]}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>Commencer</Text>
                            <ArrowRight size={20} color={theme.colors.onPrimary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
    },
    welcomeText: {
        fontSize: 18,
        fontFamily: 'Text-Medium',
        marginBottom: 8,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    nameText: {
        fontSize: 42,
        fontFamily: 'Text-Bold', // Clean bold font
        textAlign: 'center',
        marginBottom: 24,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Text-Regular',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    divider: {
        width: 60,
        height: 4,
        borderRadius: 2,
        marginBottom: 30,
    },
    subDescription: {
        fontSize: 18,
        fontFamily: 'Text-Medium',
        textAlign: 'center',
        lineHeight: 26,
    },
    button: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
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
        fontSize: 18,
        fontFamily: 'Text-Bold',
    },
});
