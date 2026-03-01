import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, ChevronRight, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import StorageHandler from '../../../core/StorageHandler';
import AccountHandler from '../../../core/AccountHandler';
import ColorsHandler from '../../../core/ColorsHandler';
import MarksHandler from '../../../core/MarksHandler';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get('window');

export default function OnboardingColorsPage({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme } = useGlobalAppContext();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    // Data State
    const [isLoading, setIsLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);

    // We will just expand the selected subject to show colors
    const [expandedSubjectId, setExpandedSubjectId] = useState(null);

    useEffect(() => {
        loadSubjects();

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

    const loadSubjects = async () => {
        try {
            setIsLoading(true);
            const account = await AccountHandler.getMainAccount();
            if (!account) {
                setIsLoading(false);
                return;
            }

            // Fetch marks to get subjects
            // We retry a few times because data might be fetching in background
            let marksData = await StorageHandler.getData("marks");
            let retryCount = 0;
            while ((!marksData || !marksData[account.id]) && retryCount < 5) {
                await new Promise(r => setTimeout(r, 1000));
                marksData = await StorageHandler.getData("marks");
                retryCount++;
            }

            // If still missing, trigger a manual fetch
            if (!marksData || !marksData[account.id]) {
                console.log("[OnboardingColors] Marks still missing after wait, triggering fetch...");
                await MarksHandler.getMarks(account.id);
                marksData = await StorageHandler.getData("marks");
            }

            if (marksData && marksData[account.id] && marksData[account.id].data) {
                const periods = marksData[account.id].data;
                // Find active period or YEAR
                let targetPeriod = null;
                // Try to find current period
                const activePeriodKey = Object.keys(periods).find(k => k !== "YEAR" && !periods[k].isFinished);
                if (activePeriodKey) {
                    targetPeriod = periods[activePeriodKey];
                } else if (periods["YEAR"]) {
                    targetPeriod = periods["YEAR"];
                } else {
                    // Fallback to last one
                    const keys = Object.keys(periods).sort();
                    targetPeriod = periods[keys[keys.length - 1]];
                }

                if (targetPeriod && targetPeriod.subjects) {
                    const loadedSubjects = Object.values(targetPeriod.subjects).map(sub => ({
                        id: sub.id,
                        title: sub.title,
                        color: ColorsHandler.getSubjectColors(sub.id)
                    }));
                    // Sort by title
                    loadedSubjects.sort((a, b) => a.title.localeCompare(b.title));
                    setSubjects(loadedSubjects);
                }
            } else {
                console.log("[OnboardingColors] No marks data found, skipping subject load.");
            }
        } catch (e) {
            console.error("[OnboardingColors] Error loading subjects", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleColorChange = async (subjectId, colorPair) => {
        // Update local state
        setSubjects(prev => prev.map(s => {
            if (s.id === subjectId) {
                return { ...s, color: { dark: colorPair[0], light: colorPair[1] } };
            }
            return s;
        }));

        // Save to handler
        ColorsHandler.setSubjectColor(subjectId, colorPair[1], colorPair[0]);
    };

    const toggleSubject = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSubjectId(expandedSubjectId === id ? null : id);
    };

    const handleNext = () => {
        navigation.navigate('OnboardingDataPage');
    };

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

            <View style={[styles.content, { paddingTop: insets.top + 45, paddingBottom: insets.bottom + 20 }]}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: itemBackgroundColor, borderColor: itemBorderColor }]}>
                            <Palette size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Couleurs des Matières</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceDisabled }]}>
                            Associez une couleur à chaque matière pour vous organiser.
                        </Text>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.loadingText, { color: theme.colors.onSurfaceDisabled }]}>Récupération de vos matières...</Text>
                        </View>
                    ) : subjects.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.onBackground }]}>Aucune matière trouvée pour le moment.</Text>
                            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceDisabled }]}>Elles apparaîtront ici une fois vos notes chargées.</Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {subjects.map((subject) => {
                                const isExpanded = expandedSubjectId === subject.id;
                                return (
                                    <View key={subject.id} style={[styles.subjectCardWrapper, { borderColor: itemBorderColor }]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.subjectCard,
                                                { backgroundColor: itemBackgroundColor }
                                            ]}
                                            onPress={() => toggleSubject(subject.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.colorDot, { backgroundColor: subject.color.dark }]} />
                                            <Text style={[styles.subjectTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{subject.title}</Text>
                                            <ChevronRight
                                                size={20}
                                                color={theme.colors.onSurfaceDisabled}
                                                style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                                            />
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={[styles.paletteContainer, { backgroundColor: isLightMode ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)' }]}>
                                                <View style={styles.paletteGrid}>
                                                    {ColorsHandler.defaultColors.map((colorPair, index) => {
                                                        const isSelected = subject.color.dark === colorPair[0];
                                                        return (
                                                            <TouchableOpacity
                                                                key={index}
                                                                style={[
                                                                    styles.colorOption,
                                                                    { backgroundColor: colorPair[0] },
                                                                    isSelected && [styles.colorOptionSelected, { borderColor: theme.colors.onBackground }]
                                                                ]}
                                                                onPress={() => handleColorChange(subject.id, colorPair)}
                                                            >
                                                                {isSelected && <Check size={12} color="#FFF" />}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        fontFamily: 'Text-Medium',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Text-Bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: 'Text-Regular',
        textAlign: 'center',
    },
    scrollArea: {
        flex: 1,
    },
    subjectCardWrapper: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        height: 70,
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 16,
    },
    subjectTitle: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Text-Bold',
    },
    paletteContainer: {
        padding: 16,
        paddingTop: 16,
    },
    paletteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'flex-start',
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        transform: [{ scale: 1.1 }],
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
