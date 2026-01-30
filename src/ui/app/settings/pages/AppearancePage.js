import { memo, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeftIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeModules } from 'react-native';
let AppIcon;
try {
    const mod = require("expo-dynamic-app-icon");
    AppIcon = mod.default || mod;
} catch (e) {
    console.warn("Echec import expo-dynamic-app-icon", e);
}

import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { Themes } from "../../../../util/Styles";
import StorageHandler from "../../../../core/StorageHandler";

// Import icons
import DefaultIcon from "../../../../../assets/notianote-violet-icon.png";
import NeonIcon from "../../../../../assets/icon-neon.png";
import GoldIcon from "../../../../../assets/icon-gold.png";

// Map of available themes
const AVAILABLE_THEMES = [
    { id: 'VioletCosmique', name: "Violet Cosmique", color: '#8B5CF6' },
    { id: 'BleuOcean', name: "Bleu Océan", color: '#3B82F6' },
    { id: 'VertEmeraude', name: "Vert Émeraude", color: '#10B981' },
    { id: 'RoseAurore', name: "Rose Aurore", color: '#EC4899' },
    { id: 'OrangeSolaire', name: "Orange Solaire", color: '#F97316' },
    { id: 'CyanNeon', name: "Cyan Néon", color: '#06B6D4' },
    { id: 'NoirProfond', name: "Noir Profond", color: '#000000', borderColor: '#333' },
    { id: 'ClairModerne', name: "Clair Moderne", color: '#F1F5F9', textColor: '#000' },
];

const AVAILABLE_ICONS = [
    { id: null, name: "Défaut", image: DefaultIcon },
    { id: "neon", name: "Neon", image: NeonIcon },
    { id: "gold", name: "Gold", image: GoldIcon },
];

// Helper Header
const GalaxyHeader = ({ title, onBack, theme }) => {
    const insets = useSafeAreaInsets();
    const topPadding = Platform.OS === 'android' ? insets.top + 25 : insets.top;
    return (
        <View style={{ paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                    onPress={onBack}
                    style={{
                        position: 'absolute', left: 0,
                        backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        padding: 8,
                        borderRadius: 12,
                    }}
                >
                    <ChevronLeftIcon size={24} color={theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>{title}</Text>
            </View>
        </View>
    );
};

function AppearancePage({ navigation }) {
    const { theme, changeTheme, setIsAutoTheme } = useGlobalAppContext();
    const [selectedThemeId, setSelectedThemeId] = useState(findThemeId(theme));
    const [selectedIconId, setSelectedIconId] = useState("default");

    // Custom Native Module
    const { IconChanger } = NativeModules;

    // We don't have a getIcon function yet, so we assume default on fresh load
    // or we could persist this selection in AsyncStorage if we wanted perfect sync.

    function findThemeId(currentTheme) {
        const color = currentTheme.colors.primary;
        const bg = currentTheme.colors.background;
        // Check for NoirProfond specific background
        if (bg === '#09090b' || bg === '#000000') return 'NoirProfond';
        if (!currentTheme.dark) return 'ClairModerne';

        const match = AVAILABLE_THEMES.find(t => t.color.toLowerCase() === color.toLowerCase());
        return match ? match.id : 'VioletCosmique';
    }

    const handleThemeChange = async (themeId) => {
        setSelectedThemeId(themeId);
        const newTheme = Themes[themeId];
        if (newTheme) {
            changeTheme(newTheme);
            setIsAutoTheme(false); // Manual override

            // Persist
            await StorageHandler.saveData("theme", {
                savedTheme: themeId,
                isAutoTheme: false
            });
        }
    };

    const handleIconChange = async (iconId) => {
        // Feature temporarily disabled on ALL platforms
        Alert.alert("Bientôt disponible", "Cette fonctionnalité n'est pas encore disponible.");
        return;

        if (!IconChanger) {
            console.log("IconChanger native module invalid");
            Alert.alert("Erreur", "Module natif de changement d'icône non trouvé. Reconstruisez l'application.");
            return;
        }

        try {
            const iconName = iconId === "default" ? null : iconId;
            console.log("Changing icon to:", iconName);

            await IconChanger.changeIcon(iconName);

            setSelectedIconId(iconId);
            Alert.alert("Succès", `Icône changée pour : ${AVAILABLE_ICONS.find(i => i.id === iconId)?.name}`);
        } catch (error) {
            console.error("Error changing icon:", error);
            Alert.alert("Erreur", "Impossible de changer l'icône : " + (error.message || error));
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]} // Dynamic Theme Colors
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="Apparence" onBack={() => navigation.pop()} theme={theme} />

                <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>
                    {/* Theme Section */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceDisabled }]}>THÈME DE L'APPLICATION</Text>

                    <View style={styles.gridContainer}>
                        {AVAILABLE_THEMES.map((item) => {
                            const isSelected = selectedThemeId === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.themeCard,
                                        {
                                            borderColor: isSelected ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                            borderWidth: isSelected ? 2 : 1,
                                            backgroundColor: isSelected ? (theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : (theme.dark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)')
                                        }
                                    ]}
                                    onPress={() => handleThemeChange(item.id)}
                                >
                                    {/* Color Dot */}
                                    <View style={[
                                        styles.colorDot,
                                        { backgroundColor: item.color },
                                        item.borderColor ? { borderWidth: 1, borderColor: item.borderColor } : {}
                                    ]}>
                                        {isSelected && (
                                            <View style={styles.dotCenter} />
                                        )}
                                    </View>

                                    <Text style={[
                                        styles.themeName,
                                        {
                                            fontWeight: isSelected ? 'bold' : 'normal',
                                            opacity: isSelected ? 1 : 0.7,
                                            color: theme.colors.onBackground
                                        }
                                    ]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Logo Section */}
                    <Text style={[styles.sectionTitle, { marginTop: 30, color: theme.colors.onSurfaceDisabled }]}>LOGO DE L'APPLICATION</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                        {AVAILABLE_ICONS.map((icon, index) => {
                            const isSelected = selectedIconId === icon.id;
                            return (
                                <TouchableOpacity
                                    key={icon.name}
                                    onPress={() => handleIconChange(icon.id)}
                                    style={{ alignItems: 'center', opacity: isSelected ? 1 : 0.6 }}
                                >
                                    <View style={[
                                        styles.logoPlaceholder,
                                        {
                                            borderColor: isSelected ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                            borderWidth: isSelected ? 3 : 1
                                        }
                                    ]}>
                                        <Image
                                            source={icon.image}
                                            style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                        />
                                    </View>
                                    <Text style={{
                                        fontSize: 13,
                                        marginTop: 8,
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                        color: isSelected ? theme.colors.onBackground : theme.colors.onSurfaceDisabled
                                    }}>{icon.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 15, // More space
        marginLeft: 5,
        marginTop: 10,
        fontFamily: 'Text-Bold',
        letterSpacing: 1
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    themeCard: {
        width: '48%',
        marginBottom: 15,
        borderRadius: 16, // More rounded
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    dotCenter: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'white',
        opacity: 0.9,
    },
    themeName: {
        fontSize: 14,
        textAlign: 'center'
    },
    logoPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    }
});

export default memo(AppearancePage);
