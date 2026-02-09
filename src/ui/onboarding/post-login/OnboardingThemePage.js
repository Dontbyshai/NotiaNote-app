import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Image,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Check, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { Themes } from '../../../util/Styles';
import StorageHandler from '../../../core/StorageHandler';

// Import icons for preview
const DefaultIcon = require('../../../../assets/notianote-violet-icon.png');
const NeonIcon = require('../../../../assets/icon-neon.png');
const GoldIcon = require('../../../../assets/icon-gold.png');

const AVAILABLE_THEMES = [
    { id: 'VioletCosmique', name: "Violet Cosmique", color: '#8B5CF6' },
    { id: 'BleuOcean', name: "Bleu Océan", color: '#3B82F6' },
    { id: 'VertEmeraude', name: "Vert Émeraude", color: '#10B981' },
    { id: 'RoseAurore', name: "Rose Aurore", color: '#EC4899' },
    { id: 'OrangeSolaire', name: "Orange Solaire", color: '#F97316' },
    { id: 'CyanNeon', name: "Cyan Néon", color: '#06B6D4' },
    { id: 'NoirProfond', name: "Noir Profond", color: '#18181b', borderColor: '#333' },
    { id: 'ClairModerne', name: "Clair Moderne", color: '#F1F5F9', textColor: '#000' },
];

const AVAILABLE_ICONS = [
    { id: "default", name: "Défaut", image: DefaultIcon },
    { id: "neon", name: "Néon", image: NeonIcon },
    { id: "gold", name: "Or", image: GoldIcon },
];

export default function OnboardingThemePage({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme, changeTheme, setIsAutoTheme } = useGlobalAppContext();

    const findThemeId = (currentTheme) => {
        const color = currentTheme.colors.primary;
        const bg = currentTheme.colors.background;
        if (bg === '#09090b' || bg === '#000000') return 'NoirProfond';
        if (!currentTheme.dark) return 'ClairModerne';
        const match = AVAILABLE_THEMES.find(t => t.color.toLowerCase() === color.toLowerCase());
        return match ? match.id : 'VioletCosmique';
    };

    const [selectedThemeId, setSelectedThemeId] = useState(findThemeId(theme));
    const [selectedIconId, setSelectedIconId] = useState("default");

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleThemeSelect = async (themeId) => {
        setSelectedThemeId(themeId);
        const newTheme = Themes[themeId];
        if (newTheme) {
            changeTheme(newTheme);
            setIsAutoTheme(false);
            await StorageHandler.saveData("theme", {
                savedTheme: themeId,
                isAutoTheme: false
            });
        }
    };

    const handleIconSelect = (iconId) => {
        setSelectedIconId(iconId);
    };

    const handleNext = () => {
        navigation.navigate('OnboardingColorsPage');
    };

    // Derived color for contrast elements dependent on background darkness
    const isLightMode = !theme.dark;
    const itemBackgroundColor = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)';
    const itemBorderColor = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)';

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: itemBackgroundColor, borderColor: itemBorderColor }]}>
                            <Palette size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Personnalisation</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceDisabled }]}>
                            Choisissez une apparence qui vous ressemble.
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.scrollArea}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {/* THEMES */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceDisabled }]}>THÈME</Text>
                        <View style={styles.grid}>
                            {AVAILABLE_THEMES.map((item) => {
                                const isSelected = selectedThemeId === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor: isSelected ? (theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : itemBackgroundColor,
                                                borderColor: isSelected ? theme.colors.primary : itemBorderColor,
                                                borderWidth: isSelected ? 2 : 1
                                            }
                                        ]}
                                        onPress={() => handleThemeSelect(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.colorPreview, { backgroundColor: item.color, borderColor: item.borderColor || 'transparent', borderWidth: item.borderColor ? 1 : 0 }]}>
                                            {isSelected && <Check size={16} color={item.textColor || "#FFF"} />}
                                        </View>
                                        <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* APP ICONS */}
                        <Text style={[styles.sectionTitle, { marginTop: 30, color: theme.colors.onSurfaceDisabled }]}>ICÔNE DE L'APPLICATION</Text>
                        <View style={styles.iconGrid}>
                            {AVAILABLE_ICONS.map((item) => {
                                const isSelected = selectedIconId === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.iconCard,
                                            {
                                                backgroundColor: itemBackgroundColor,
                                                borderColor: isSelected ? theme.colors.primary : itemBorderColor,
                                                borderWidth: isSelected ? 2 : 1
                                            }
                                        ]}
                                        onPress={() => handleIconSelect(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Image source={item.image} style={styles.iconImage} />
                                        <Text style={[styles.iconName, { color: theme.colors.onSurface }]}>{item.name}</Text>
                                        {isSelected && (
                                            <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                                                <Check size={12} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </Animated.View>

                {/* Footer Button */}
                <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleNext}
                    >
                        <Text style={[styles.nextButtonText, { color: theme.colors.onPrimary }]}>Continuer</Text>
                        <ChevronRight size={20} color={theme.colors.onPrimary} />
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
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Numbers-Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Text-Regular',
        textAlign: 'center',
        lineHeight: 24,
    },
    scrollArea: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Text-Bold',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        width: '48%',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    colorPreview: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 14,
        fontFamily: 'Text-Medium',
        textAlign: 'center',
    },
    iconGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    iconCard: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconImage: {
        width: 48,
        height: 48,
        borderRadius: 10,
        marginBottom: 8,
    },
    iconName: {
        fontSize: 12,
        fontFamily: 'Text-Medium',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
    },
    nextButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    nextButtonText: {
        fontSize: 18,
        fontFamily: 'Text-Bold',
        marginRight: 8,
    },
});
