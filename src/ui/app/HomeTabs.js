import React, { useState, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { View, Platform, TouchableOpacity, Animated, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Home, BarChart3, LayoutGrid, BookOpen, CalendarDays, Mail, CreditCard, X, Plus, GraduationCap, Barcode } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import HomePage from './home/HomePage';
import CalendarPage from './calendar/CalendarPage';
import MenuPage from './menu/MenuPage';
import AdsHandler from '../../core/AdsHandler';

// Existing Pages imported as Tabs
import MarksPage from './marks/MainPage';
import UpcomingHomeworkPage from './homework/UpcomingHomeworkPage';

const Tab = createBottomTabNavigator();

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { useGlobalAppContext } from '../../util/GlobalAppContext';

const FloatingMenuButton = ({ children, onPress }) => {
    const navigation = useNavigation();
    const { theme } = useGlobalAppContext();
    const [isOpen, setIsOpen] = useState(false);
    // Separate animations for Native (perf) and Color (JS required)
    const animationNative = useRef(new Animated.Value(0)).current;
    const animationColor = useRef(new Animated.Value(0)).current;

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;

        Animated.parallel([
            Animated.spring(animationNative, {
                toValue,
                friction: 5,
                useNativeDriver: true,
            }),
            Animated.spring(animationColor, {
                toValue,
                friction: 5,
                useNativeDriver: false, // Color interpolation
            })
        ]).start();

        setIsOpen(!isOpen);
    };

    const rotation = animationNative.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-90deg'] // Standard rotation, lands on Plus
    });

    const buttonColor = animationColor.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.primary, theme.colors.error]
    });

    const gridOpacity = animationNative.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0] });
    const plusOpacity = animationNative.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] });

    const messagerieTranslateY = animationNative.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -160] // Increased spacing
    });
    const messagerieOpacity = animationNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    const cantineTranslateY = animationNative.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -80] // Increased spacing
    });
    const cantineOpacity = animationNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    const schoolLifeTranslateY = animationNative.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -240] // Above Message (-160)
    });
    const schoolLifeOpacity = animationNative.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    // Label animation: Slide out from behind the icon (translateX 50 -> 0)
    const labelTranslateX = animationNative.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0]
    });
    const labelOpacity = animationNative.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, 1] });

    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', top: -25 }}>
            {/* Backdrop Blur Overlay */}
            {isOpen && (
                <Pressable onPress={toggleMenu} style={{
                    position: 'absolute',
                    width: 3000, height: 3000,
                    top: -1500, left: -1500,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    zIndex: -1
                }}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </Pressable>
            )}

            {/* Options - pointerEvents ensures they don't block tabs when closed */}
            <Animated.View
                pointerEvents={isOpen ? "auto" : "none"}
                style={{
                    position: 'absolute',
                    transform: [{ translateY: messagerieTranslateY }, { translateX: 60 }],
                    opacity: messagerieOpacity,
                    alignItems: 'center', zIndex: 1
                }}
            >
                <AnimatedPressable onPress={() => { toggleMenu(); AdsHandler.showInterstitialAd(() => navigation.navigate('MessageriePage'), 'message'); }} style={{
                    position: 'absolute', right: 70,
                    transform: [{ translateX: labelTranslateX }],
                    opacity: labelOpacity,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, top: 8,
                    borderWidth: 1, borderColor: theme.colors.surfaceOutline,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    minWidth: 120
                }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} numberOfLines={1}>Messagerie</Text>
                </AnimatedPressable>
                <TouchableOpacity style={[styles.circleButton, { backgroundColor: '#3B82F6' }]} onPress={() => { toggleMenu(); AdsHandler.showInterstitialAd(() => navigation.navigate('MessageriePage'), 'message'); }}>
                    <Mail color="#FFF" size={24} />
                </TouchableOpacity>
            </Animated.View>

            <Animated.View
                pointerEvents={isOpen ? "auto" : "none"}
                style={{
                    position: 'absolute',
                    transform: [{ translateY: cantineTranslateY }, { translateX: 60 }],
                    opacity: cantineOpacity,
                    alignItems: 'center', zIndex: 1
                }}
            >
                <AnimatedPressable onPress={() => { toggleMenu(); navigation.navigate('CantinePage'); }} style={{
                    position: 'absolute', right: 70,
                    transform: [{ translateX: labelTranslateX }],
                    opacity: labelOpacity,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, top: 8,
                    borderWidth: 1, borderColor: theme.colors.surfaceOutline,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    minWidth: 140
                }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} numberOfLines={1}>Carte Cantine</Text>
                </AnimatedPressable>
                <TouchableOpacity style={[styles.circleButton, { backgroundColor: '#8B5CF6' }]} onPress={() => { toggleMenu(); navigation.navigate('CantinePage'); }}>
                    <Barcode color="#FFF" size={24} />
                </TouchableOpacity>
            </Animated.View>

            {/* Vie Scolaire (Top) */}
            <Animated.View
                pointerEvents={isOpen ? "auto" : "none"}
                style={{
                    position: 'absolute',
                    transform: [{ translateY: schoolLifeTranslateY }, { translateX: 60 }],
                    opacity: schoolLifeOpacity,
                    alignItems: 'center', zIndex: 1
                }}
            >
                <AnimatedPressable onPress={() => { toggleMenu(); AdsHandler.showInterstitialAd(() => navigation.navigate('SchoolLifePage'), 'schoollife'); }} style={{
                    position: 'absolute', right: 70,
                    transform: [{ translateX: labelTranslateX }],
                    opacity: labelOpacity,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, top: 8,
                    borderWidth: 1, borderColor: theme.colors.surfaceOutline,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    minWidth: 140
                }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} numberOfLines={1}>Vie Scolaire</Text>
                </AnimatedPressable>
                <TouchableOpacity style={[styles.circleButton, { backgroundColor: '#F59E0B' }]} onPress={() => { toggleMenu(); AdsHandler.showInterstitialAd(() => navigation.navigate('SchoolLifePage'), 'schoollife'); }}>
                    <GraduationCap color="#FFF" size={24} />
                </TouchableOpacity>
            </Animated.View>

            {/* Main Button */}
            <TouchableOpacity onPress={toggleMenu} activeOpacity={0.9} style={{ zIndex: 2 }}>
                <Animated.View style={[styles.gradientButton, { backgroundColor: buttonColor, borderWidth: 4, borderColor: theme.colors.background }]}>
                    <Animated.View style={{ position: 'absolute', opacity: gridOpacity }}>
                        <LayoutGrid color={(!isOpen && theme.colors.primary === '#FAFAFA') ? "#000" : "#FFF"} size={28} />
                    </Animated.View>
                    <Animated.View style={{ position: 'absolute', opacity: plusOpacity, transform: [{ rotate: rotation }] }}>
                        <Plus color="#FFF" size={32} />
                    </Animated.View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

function HomeTabs() {
    const { theme } = useGlobalAppContext();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 35,
                    left: 0,
                    right: 0,
                    marginHorizontal: '6.5%',
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    elevation: 10,
                    paddingBottom: 0, // Fix alignment
                },
                tabBarBackground: () => (
                    <BlurView
                        tint={theme.dark ? "dark" : "light"}
                        intensity={80}
                        style={{
                            flex: 1,
                            borderRadius: 30,
                            overflow: 'hidden',
                            backgroundColor: theme.dark ?
                                (Platform.OS === 'android' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.4)') :
                                (Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.8)'),
                            borderWidth: 1,
                            borderColor: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'
                        }}
                    />
                ),
                tabBarShowLabel: false,
                tabBarActiveTintColor: theme.colors.primary, // Dynamic Active Color
                tabBarInactiveTintColor: theme.colors.onSurfaceDisabled,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomePage}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <Home color={color} size={26} strokeWidth={focused ? 2.5 : 2} style={{ top: 10 }} />
                    )
                }}
            />
            <Tab.Screen
                name="MarksTab"
                component={MarksPage}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <BarChart3 color={color} size={26} strokeWidth={focused ? 2.5 : 2} style={{ top: 10 }} />
                    )
                }}
            />

            {/* Middle Button - Floating Menu */}
            <Tab.Screen
                name="MenuWithFloatingAction"
                component={MenuPage} // Kept MenuPage as dummy component behind needed
                options={{
                    tabBarButton: (props) => (
                        <FloatingMenuButton {...props} />
                    )
                }}
            />

            <Tab.Screen
                name="HomeworkTab"
                component={UpcomingHomeworkPage}
                initialParams={{ cacheAbstractHomeworks: { days: {}, weeks: {}, homeworks: {} } }}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <BookOpen color={color} size={26} strokeWidth={focused ? 2.5 : 2} style={{ top: 10 }} />
                    )
                }}
            />
            <Tab.Screen
                name="CalendarTab"
                component={CalendarPage}
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <CalendarDays color={color} size={26} strokeWidth={focused ? 2.5 : 2} style={{ top: 10 }} />
                    )
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    mainButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    gradientButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#020617', // Match app bg
    },
    circleButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    }
});

export default HomeTabs;
