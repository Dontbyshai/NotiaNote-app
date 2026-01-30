import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Alert, Platform } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, BookOpen, Calendar, Mail, Clock, ChevronRight, TrendingUp, TrendingDown, RefreshCw, Utensils } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';

import CustomProfilePhoto from '../../components/CustomProfilePhoto';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { registerForPushNotificationsAsync } from "../../../core/NotificationHandler";
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import MarksHandler from '../../../core/MarksHandler';
import HomeworkHandler from '../../../core/HomeworkHandler';
import TimetableHandler from '../../../core/TimetableHandler';
import EcoleDirecteApi from '../../../services/EcoleDirecteApi';
import StorageHandler from '../../../core/StorageHandler';
import AccountHandler from '../../../core/AccountHandler';
import ColorsHandler from '../../../core/ColorsHandler';
import WidgetHandler from '../../../core/WidgetHandler';
import AdsHandler from '../../../core/AdsHandler';
import EvolutionChartModal from '../marks/marks-overview/EvolutionChartModal';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import BannerAdComponent from '../../components/Ads/BannerAdComponent';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

export default function HomePage({ navigation }) {
    const insets = useSafeAreaInsets();
    const { accountID, mainAccount } = useCurrentAccountContext();
    const { theme } = useGlobalAppContext();
    const isCosmic = theme.colors.primary === '#8B5CF6';

    const [refreshing, setRefreshing] = useState(false);
    const [chartModalVisible, setChartModalVisible] = useState(false);
    const [isLunchTime, setIsLunchTime] = useState(false);
    const [stats, setStats] = useState({
        average: '--',
        homeworkCount: 0,
        courseCount: 0,
        messageCount: 0,
        unreadMessageCount: 0,
        averageHistory: []
    });
    const [showEvolutionArrows, setShowEvolutionArrows] = useState(true);

    // --- Mini Chart Logic ---
    const MiniLineChart = ({ data, width, height, color = "#a78bfa" }) => {
        if (!data || data.length < 2) return null;

        const validData = data.filter(d => d.value !== undefined).map(d => d.value);
        if (validData.length < 2) return null;

        // Dynamic range for better visualization
        const maxData = Math.max(...validData);
        const minData = Math.min(...validData);
        const padding = (maxData - minData) * 0.2 || 0.5; // 20% padding or default 0.5

        const max = Math.min(20, maxData + padding);
        const min = Math.max(0, minData - padding);
        const range = max - min || 1;

        const points = validData.map((val, i) => {
            const x = (i / (validData.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return { x, y };
        });

        // Smooth Path
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i > 0 ? i - 1 : i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) * 0.15;
            const cp1y = p1.y + (p2.y - p0.y) * 0.15;
            const cp2x = p2.x - (p3.x - p1.x) * 0.15;
            const cp2y = p2.y - (p3.y - p1.y) * 0.15;

            d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
        }

        // Gradient Area
        const areaPath = `${d} L ${width} ${height} L 0 ${height} Z`;

        return (
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id="miniChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.5" />
                        <Stop offset="1" stopColor={color} stopOpacity="0" />
                    </LinearGradient>
                </Defs>
                <Path d={areaPath} fill="url(#miniChartGradient)" />
                <Path d={d} stroke={color} strokeWidth="2.5" fill="none" />
            </Svg>
        );
    };
    const [todayLessons, setTodayLessons] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);
    const [upcomingHomeworks, setUpcomingHomeworks] = useState([]);

    const scrollViewRef = useRef(null);

    useEffect(() => {
        console.log('[HomePage] useEffect triggered');
        console.log('[HomePage] mainAccount:', mainAccount);
        console.log('[HomePage] mainAccount?.id:', mainAccount?.id);

        if (accountID) {
            console.log('[HomePage] Loading data for account:', accountID);
            loadAllData();

            // Init notifications (permissions only)
            registerForPushNotificationsAsync();

            // Load preferences
            const loadPrefs = async () => {
                const showArrows = await AccountHandler.getPreference("ui_show_evolution_arrows", true);
                setShowEvolutionArrows(showArrows);
            };
            loadPrefs();

        } else {
            console.log('[HomePage] No accountID yet, waiting...');
            setRefreshing(false);
        }
    }, [accountID]);

    // Helper to resolve color by checking both Code and Name (and their uppercase variants)
    // Helper to resolve color
    const resolveColor = (code, name) => {
        // Pass both Code and Name to let ColorsHandler determine the best canonical key
        // This ensures synch between Schedule (Code-heavy) and Grades (Name-heavy)
        return ColorsHandler.getSubjectColors(code, name).dark || '#a78bfa';
    };

    // Listen for color changes
    useEffect(() => {
        const updateColors = () => {
            setTodayLessons(prevLessons => prevLessons.map(l => ({
                ...l,
                color: resolveColor(l.codeMatiere, l.matiere)
            })));

            setUpcomingHomeworks(prevHomeworks => prevHomeworks.map(hw => ({
                ...hw,
                color: resolveColor(hw.subjectID, hw.subjectTitle)
            })));
        };

        ColorsHandler.addListener(updateColors);
        return () => ColorsHandler.removeListener(updateColors);
    }, []);

    // Helper: Safe Date Parsing for Android (handles "YYYY-MM-DD HH:MM")
    const safeDate = (dateStr) => {
        if (!dateStr) return new Date();
        // If already a Date object
        if (dateStr instanceof Date) return dateStr;
        // Replace space with T for ISO compliance on Android if string
        if (typeof dateStr === 'string') {
            return new Date(dateStr.replace(' ', 'T'));
        }
        return new Date(dateStr);
    };

    // Check for Lunch Time (Dynamic based on Schedule)
    useEffect(() => {
        const checkLunchTime = () => {
            const now = new Date();
            let isLunch = false;

            // 1. Try to find explicit lunch event in timetable
            // Keywords: Repas, Cantine, Midi, Déjeuner, Pause Méridienne
            const lunchLesson = todayLessons.find(l => {
                const title = (l.matiere || "").toLowerCase();
                const text = (l.text || "").toLowerCase();
                return title.includes('repas') || title.includes('cantine') || title.includes('midi') || title.includes('déjeuner') ||
                    text.includes('repas') || text.includes('cantine') || text.includes('midi') || text.includes('déjeuner');
            });

            if (lunchLesson) {
                // Found a specific event
                const start = safeDate(lunchLesson.start_date);
                const end = safeDate(lunchLesson.end_date);

                // Show from 30 mins before start, until the end of the meal slot
                const startWindow = new Date(start);
                startWindow.setMinutes(start.getMinutes() - 30);

                if (now >= startWindow && now <= end) {
                    isLunch = true;
                }
            }

            setIsLunchTime(isLunch);
        };

        checkLunchTime();
        const interval = setInterval(checkLunchTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [todayLessons]);

    async function loadAllData() {
        if (!accountID) {
            console.log('[HomePage] No accountID, skipping data load');
            setRefreshing(false);
            return;
        }

        console.log('[HomePage] Loading all data for account:', accountID);
        setRefreshing(true);

        try {
            await ColorsHandler.load();
        } catch (e) {
            console.warn("Colors load failed", e);
        }

        // Load all data in parallel
        await Promise.all([
            loadMarks(),
            loadTimetable(),
            loadMessages(),
            loadHomework()
        ]);

        // Update widgets
        WidgetHandler.updateWidgetData();

        setRefreshing(false);
        console.log('[HomePage] Data loading complete');
    }

    async function loadMarks() {
        if (!accountID) return;

        try {
            console.log('[HomePage] Loading marks...');
            await MarksHandler.getMarks(accountID);
            const averages = await MarksHandler.getAverages(accountID);
            console.log('[HomePage] Averages:', averages);

            if (averages?.general) {
                const avg = parseFloat(averages.general).toFixed(2);
                const label = averages.periodName ? `MOYENNE ${averages.periodName.toUpperCase()}` : 'MOYENNE GÉNÉRALE';
                console.log('[HomePage] Setting average to:', avg);

                // Extract history for mini-chart
                const history = averages.history || [];

                setStats(prev => ({
                    ...prev,
                    average: avg,
                    averageLabel: label,
                    averageHistory: history
                }));
            } else {
                console.log('[HomePage] No general average found');
            }
        } catch (e) {
            console.warn("Marks fetch failed", e);
        }
    }

    async function loadTimetable() {
        if (!accountID) return;

        try {
            console.log('[HomePage] Loading timetable...');
            const today = new Date();
            // Load a wider range to be sure (current week)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

            const startStr = TimetableHandler.formatDate(startOfWeek);
            const endStr = TimetableHandler.formatDate(endOfWeek);

            console.log(`[HomePage] Fetching timetable from ${startStr} to ${endStr}`);
            let allLessons = await TimetableHandler.getTimetable(accountID, startStr, endStr);
            allLessons = allLessons || []; // Secure array if null/undefined

            // Filter locally for today to keep UI logic consistent for now, but inspect all data
            const todayStr = TimetableHandler.formatDate(today);
            let lessons = allLessons.filter(l => l.start_date.startsWith(todayStr));

            console.log('[HomePage] Total lessons fetched:', allLessons?.length || 0);
            console.log('[HomePage] Lessons for today:', lessons?.length || 0);

            if (lessons && Array.isArray(lessons)) {
                // Keep all lessons to show cancellations/changes
                const validLessons = lessons;
                validLessons.sort((a, b) => a.start_date.localeCompare(b.start_date));

                validLessons.forEach(l => {
                    l.color = resolveColor(l.codeMatiere, l.matiere);
                });

                console.log('[HomePage] Valid lessons:', validLessons.length);
                setTodayLessons(validLessons);
                setStats(prev => ({ ...prev, courseCount: validLessons.length }));
            }
        } catch (e) {
            console.warn("Timetable fetch failed", e);
        }
    }

    async function loadMessages() {
        if (!accountID) return;

        try {
            console.log('[HomePage] Loading messages...');
            const response = await EcoleDirecteApi.getMessages(accountID, 'received', 0);
            console.log('[HomePage] Messages response status:', response?.status);

            if (response.status === 200 && response.data?.data) {
                const msgs = response.data.data.messages?.received || [];
                console.log('[HomePage] Messages count:', msgs.length);

                // Count unread
                const unreadCount = msgs.filter(m => {
                    return (m.read !== undefined) ? !m.read : (m.lu !== undefined ? !m.lu : true);
                }).length;

                setRecentMessages(msgs.slice(0, 3));
                setStats(prev => ({ ...prev, messageCount: msgs.length, unreadMessageCount: unreadCount }));
            }
        } catch (e) {
            console.error("Messages load failed:", e);
        }
    }

    async function loadHomework() {
        if (!accountID) return;

        try {
            console.log('[HomePage] Loading homework...');
            await HomeworkHandler.getAllHomework(accountID);
            const hwCache = await StorageHandler.getData("homework");
            console.log('[HomePage] HW Cache exists:', !!hwCache?.[accountID]);

            if (hwCache?.[accountID]?.data) {
                const { days, homeworks } = hwCache[accountID].data;
                let allUpcoming = [];
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                if (days) {
                    Object.keys(days).forEach(dateKey => {
                        const dateObj = new Date(dateKey);
                        if (dateObj >= now) {
                            const ids = days[dateKey];
                            ids.forEach(id => {
                                const hw = homeworks[id];
                                if (hw && !hw.done) {
                                    const color = resolveColor(hw.subjectID, hw.subjectTitle);
                                    allUpcoming.push({ ...hw, date: dateKey, color });
                                }
                            });
                        }
                    });
                }

                allUpcoming.sort((a, b) => a.date.localeCompare(b.date));
                console.log('[HomePage] Upcoming homework count:', allUpcoming.length);
                setStats(prev => ({ ...prev, homeworkCount: allUpcoming.length }));
                setUpcomingHomeworks(allUpcoming.slice(0, 4));
            }
        } catch (e) {
            console.warn("HW cache load failed", e);
        }
    }

    const formatTime = (dateString) => {
        const date = safeDate(dateString);
        if (isNaN(date.getTime())) return "--:--";
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        const date = safeDate(dateString);
        if (isNaN(date.getTime())) return "--/--";
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    // Glass Card Component (Solid background instead of gradient)
    const GlassCard = ({ children, style, onPress }) => (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
            <View
                style={[{
                    borderRadius: 20,
                    padding: 20,
                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 1,
                    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    // Shadows
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: theme.dark ? 0.3 : 0.1,
                    shadowRadius: 8,
                    // Fix for Android grey squares: Remove elevation on Android if transparent
                    elevation: Platform.OS === 'android' ? 0 : 5,
                    overflow: 'hidden', // Ensure cleaner edges
                }, style]}
            >
                {children}
            </View>
        </TouchableOpacity>
    );

    const isLessonActive = (lesson) => {
        const now = new Date();
        const start = safeDate(lesson.start_date);
        const end = safeDate(lesson.end_date);
        return now >= start && now <= end;
    };

    // Auto-scroll to current lesson
    useEffect(() => {
        if (todayLessons.length > 0 && scrollViewRef.current) {
            const activeIndex = todayLessons.findIndex(lesson => isLessonActive(lesson));
            if (activeIndex !== -1) {
                // Calculate position: (Card Width 150 + Margin 12) * index
                const scrollToX = activeIndex * (150 + 12);
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
                }, 500); // Small delay to ensure layout is done
            }
        }
    }, [todayLessons]);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar style={theme.dark ? "light" : "dark"} />
            {/* Animated Background */}
            <ExpoLinearGradient
                colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]} // Dynamic glow based on theme
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadAllData}
                        tintColor="#a78bfa"
                        colors={['#a78bfa']}
                    />
                }
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Hero Header */}
                <View style={{ paddingTop: insets.top + 25, paddingHorizontal: 20, marginBottom: 35 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CustomProfilePhoto size={52} accountID={accountID} onPress={() => navigation.navigate("SettingsStack")} />
                            <View style={{ marginLeft: 16 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 13, marginBottom: 2 }}>Bienvenue 👋</Text>
                                <Text style={{ color: theme.colors.onBackground, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 }}>
                                    {(() => {
                                        console.log('[HomePage] mainAccount for name:', mainAccount);
                                        return mainAccount?.prenom || mainAccount?.firstName || mainAccount?.nom || 'Élève';
                                    })()}
                                </Text>
                            </View>
                        </View>



                        <TouchableOpacity
                            onPress={() => loadAllData()}
                            disabled={refreshing}
                            style={{
                                width: 42, height: 42,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: theme.colors.primary + '1A', // 10% opacity
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: theme.colors.primary + '33' // 20% opacity
                            }}
                        >
                            <RefreshCw size={20} color={refreshing ? "#64748B" : theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Lunch Time Card (Cantine) - Only shows between 11h and 14h */}
                    {isLunchTime && (
                        <GlassCard
                            gradient={['rgba(249, 115, 22, 0.4)', 'rgba(234, 88, 12, 0.4)']} // Orange Gradient
                            style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            onPress={() => navigation.navigate("CantinePage")}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: 42, height: 42, borderRadius: 21,
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginRight: 15
                                }}>
                                    <Utensils color={theme.dark ? "#FFF" : "#000"} size={20} strokeWidth={2.5} />
                                </View>
                                <View>
                                    <Text style={{ color: theme.dark ? '#FFF' : '#000', fontSize: 16, fontWeight: '800' }}>Carte de Cantine</Text>
                                    <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: '600' }}>Bon appétit ! 🍽️</Text>
                                </View>
                            </View>
                            <View style={{
                                width: 32, height: 32, borderRadius: 16,
                                backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <ChevronRight color={theme.dark ? "#FFF" : "#000"} size={18} />
                            </View>
                        </GlassCard>
                    )}

                    {/* Big Average Card */}
                    <GlassCard
                        gradient={theme.dark ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)'] : ['#FFFFFF', '#FFFFFF']}
                        onPress={() => navigation.navigate("MarksTab")}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.7)' : theme.colors.onSurfaceDisabled, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                                    {stats.averageLabel || 'MOYENNE GÉNÉRALE'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 50, fontWeight: '900', letterSpacing: -2 }}>
                                        {stats.average}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.8)' : theme.colors.onSurface, fontSize: 24, fontWeight: '600', marginLeft: 4 }}>/20</Text>

                                        {showEvolutionArrows && stats.averageHistory && stats.averageHistory.length >= 2 && (
                                            (() => {
                                                const history = stats.averageHistory;
                                                const latest = history[history.length - 1]?.value;
                                                const previous = history[history.length - 2]?.value;
                                                if (latest === undefined || previous === undefined || latest === previous) return null;

                                                const isUp = latest > previous;
                                                const Color = isUp ? (theme.dark ? '#4ade80' : '#10b981') : (theme.dark ? '#f87171' : '#ef4444');
                                                const Icon = isUp ? TrendingUp : TrendingDown;

                                                return (
                                                    <View style={{
                                                        marginLeft: 10,
                                                        backgroundColor: Color + '20',
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 2,
                                                        borderRadius: 8,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}>
                                                        <Icon size={14} color={Color} strokeWidth={3} />
                                                        <Text style={{
                                                            color: Color,
                                                            fontSize: 12,
                                                            fontWeight: 'bold',
                                                            marginLeft: 2
                                                        }}>
                                                            {Math.abs(latest - previous).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                );
                                            })()
                                        )}
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity // Make this box clickable to open chart
                                onPress={() => AdsHandler.showRewardedAd(() => setChartModalVisible(true), null, 'general_1')}
                                style={{
                                    width: 100, height: 70, borderRadius: 20,
                                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                    alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                {stats.averageHistory && stats.averageHistory.length > 2 ? (
                                    <View>
                                        <MiniLineChart
                                            data={stats.averageHistory}
                                            width={100}
                                            height={60}
                                            color={theme.dark ? "#FFFFFF" : theme.colors.primary}
                                        />
                                    </View>
                                ) : (
                                    <TrendingUp color={theme.colors.primary} size={32} strokeWidth={2.5} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                <EvolutionChartModal
                    visible={chartModalVisible}
                    onClose={() => setChartModalVisible(false)}
                    data={stats.averageHistory}
                />

                {/* Quick Stats Grid */}
                <View style={{ paddingHorizontal: 20, marginBottom: 35 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {/* Devoirs */}
                        {/* Devoirs */}
                        <GlassCard
                            style={{ flex: 1, marginRight: 8, paddingVertical: 18 }}
                            gradient={theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['#FFFFFF', '#FFFFFF']}
                            onPress={() => navigation.navigate("HomeworkTab")}
                        >
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 12
                                }}>
                                    <BookOpen color={theme.dark ? "#FFFFFF" : theme.colors.primary} size={24} strokeWidth={2.5} />
                                    {stats.homeworkCount > 0 && (
                                        <View style={{
                                            position: 'absolute', top: -4, right: -4,
                                            backgroundColor: '#ef4444',
                                            minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
                                            alignItems: 'center', justifyContent: 'center',
                                            borderWidth: 2, borderColor: isCosmic ? 'rgba(59, 130, 246, 0.3)' : theme.colors.primary + '40'
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                                {stats.homeworkCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={{ color: theme.colors.onBackground, fontSize: 28, fontWeight: '900' }}>{stats.homeworkCount}</Text>
                                <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 11, fontWeight: '600', marginTop: 4 }}>DEVOIRS</Text>
                            </View>
                        </GlassCard>

                        {/* Cours */}
                        <GlassCard
                            style={{ flex: 1, marginHorizontal: 8, paddingVertical: 18 }}
                            gradient={theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['#FFFFFF', '#FFFFFF']}
                            onPress={() => navigation.navigate("CalendarTab")}
                        >
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 12
                                }}>
                                    <Calendar color={theme.dark ? "#FFFFFF" : theme.colors.primary} size={24} strokeWidth={2.5} />
                                </View>
                                <Text style={{ color: theme.colors.onBackground, fontSize: 28, fontWeight: '900' }}>{stats.courseCount}</Text>
                                <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 11, fontWeight: '600', marginTop: 4 }}>COURS</Text>
                            </View>
                        </GlassCard>

                        {/* Messages */}
                        <GlassCard
                            style={{ flex: 1, marginLeft: 8, paddingVertical: 18 }}
                            gradient={theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['#FFFFFF', '#FFFFFF']}
                            onPress={() => AdsHandler.showInterstitialAd(() => navigation.navigate("MessageriePage"), 'message')}
                        >
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 12
                                }}>
                                    <Mail color={theme.dark ? "#FFFFFF" : theme.colors.primary} size={24} strokeWidth={2.5} />
                                    {stats.unreadMessageCount > 0 && (
                                        <View style={{
                                            position: 'absolute', top: -4, right: -4,
                                            backgroundColor: '#ef4444',
                                            minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
                                            alignItems: 'center', justifyContent: 'center',
                                            borderWidth: 2, borderColor: isCosmic ? 'rgba(236, 72, 153, 0.3)' : theme.colors.primary + '40'
                                        }}>
                                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                                {stats.unreadMessageCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={{ color: theme.colors.onBackground, fontSize: 28, fontWeight: '900' }}>{stats.messageCount}</Text>
                                <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 11, fontWeight: '600', marginTop: 4 }}>MESSAGES</Text>
                            </View>
                        </GlassCard>
                    </View>
                </View>

                {/* Today's Schedule */}
                <View style={{ marginBottom: 35 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 }}>
                        <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontWeight: '800' }}>📅 Aujourd'hui</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("CalendarTab")}>
                            <Text style={{ color: '#a78bfa', fontSize: 14, fontWeight: '600' }}>Voir tout →</Text>
                        </TouchableOpacity>
                    </View>

                    {todayLessons.length > 0 ? (
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        >
                            {todayLessons.map((lesson, index) => {
                                const isActive = isLessonActive(lesson);

                                // Status Detection
                                const isCancelled = lesson.isAnnule || lesson.statut === 'Annulé' || lesson.text?.toLowerCase().includes('absent') || lesson.text?.toLowerCase().includes('annulé');
                                const isExam = lesson.test || lesson.interrogation || (lesson.text && (lesson.text.toLowerCase().includes('controle') || lesson.text.toLowerCase().includes('évaluation') || lesson.text.toLowerCase().includes('exam')));
                                const isModified = !isCancelled && (lesson.isModifie || lesson.statut === 'Modifié' || (lesson.text && (lesson.text.toLowerCase().includes('changement') || lesson.text.toLowerCase().includes('salle'))));

                                const handlePress = () => {
                                    navigation.navigate("CalendarTab");
                                };

                                return (
                                    <GlassCard
                                        key={index}
                                        onPress={handlePress}
                                        style={{
                                            width: 165, // Slightly wider
                                            height: 105, // Slightly taller
                                            marginRight: 12,
                                            padding: 0,
                                            borderColor: isActive ? (lesson.color || '#a78bfa') : 'rgba(255,255,255,0.08)',
                                            borderWidth: isActive ? 2.5 : 1, // Thicker border for active
                                            borderRadius: 20,
                                            overflow: 'hidden'
                                        }}
                                        gradient={
                                            isActive ? (theme.dark ? ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)'] : ['#FFFFFF', '#FFFFFF']) :
                                                isCancelled ? (theme.dark ? ['rgba(50, 20, 20, 0.4)', 'rgba(30, 10, 10, 0.4)'] : ['#FEE2E2', '#FEE2E2']) :
                                                    Platform.select({
                                                        android: theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)'],
                                                        ios: ['transparent', 'transparent']
                                                    })
                                        }
                                    >
                                        <View style={{ flexDirection: 'row', height: '100%', alignItems: 'center', paddingHorizontal: 12 }}>
                                            {/* Neon Vertical Bar */}
                                            <View style={{
                                                width: 3,
                                                height: '60%',
                                                backgroundColor: isCancelled ? '#ef4444' : (lesson.color || '#a78bfa'),
                                                borderRadius: 2,
                                                marginRight: 14
                                            }} />

                                            <View style={{ flex: 1, paddingVertical: 10, justifyContent: 'center' }}>
                                                {/* Status Badges - Absolute Top Right */}
                                                {(isActive || isCancelled || isExam || isModified) && (
                                                    <View style={{ position: 'absolute', top: 12, right: -12 }}>
                                                        {isCancelled && <Text style={{ fontSize: 12 }}>❌</Text>}
                                                        {isExam && !isCancelled && <Text style={{ fontSize: 12 }}>📝</Text>}
                                                        {isModified && !isCancelled && !isExam && <Text style={{ fontSize: 12 }}>⚠️</Text>}
                                                    </View>
                                                )}

                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                                    <Clock color={isActive ? (theme.dark ? "#FFF" : theme.colors.primary) : (theme.dark ? "rgba(255,255,255,0.6)" : theme.colors.onSurfaceDisabled)} size={12} strokeWidth={2.5} />
                                                    <Text style={{
                                                        color: isActive ? (theme.dark ? "#FFF" : theme.colors.primary) : (theme.dark ? "rgba(255,255,255,0.8)" : theme.colors.onSurface),
                                                        fontSize: 12, fontWeight: '700', marginLeft: 6,
                                                        textDecorationLine: isCancelled ? 'line-through' : 'none',
                                                        opacity: isCancelled ? 0.6 : 1
                                                    }}>
                                                        {formatTime(lesson.start_date)}
                                                        {lesson.end_date && ` - ${formatTime(lesson.end_date)}`}
                                                    </Text>
                                                </View>

                                                {/* Subject Title */}
                                                <Text style={{
                                                    color: theme.dark ? '#FFF' : theme.colors.onSurface, fontSize: 15, fontWeight: '700', marginBottom: 4,
                                                    textDecorationLine: isCancelled ? 'line-through' : 'none',
                                                    opacity: isCancelled ? 0.6 : 1,
                                                    textShadowColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2
                                                }} numberOfLines={2}>
                                                    {lesson.matiere || lesson.text}
                                                </Text>

                                                {/* Room */}
                                                <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.5)' : theme.colors.onSurfaceDisabled, fontSize: 12, fontWeight: '600' }}>
                                                    {lesson.salle || 'Salle inconnue'}
                                                </Text>
                                            </View>
                                        </View>
                                    </GlassCard>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <View style={{ paddingHorizontal: 20 }}>
                            <GlassCard style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <Text style={{ color: '#6b7280', fontSize: 15 }}>Aucun cours aujourd'hui 🎉</Text>
                            </GlassCard>
                        </View>
                    )}
                </View>

                {/* Upcoming Homework */}
                <View style={{ paddingHorizontal: 20, marginBottom: 35 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontWeight: '800' }}>📚 Devoirs à faire</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("HomeworkTab")}>
                            <Text style={{ color: '#a78bfa', fontSize: 14, fontWeight: '600' }}>Voir tout →</Text>
                        </TouchableOpacity>
                    </View>

                    {upcomingHomeworks.length > 0 ? (
                        upcomingHomeworks.map((hw, index) => (
                            <GlassCard
                                key={index}
                                style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }} // Remove padding for full control
                                gradient={Platform.select({
                                    android: theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['#FFFFFF', '#FFFFFF'],
                                    ios: ['transparent', 'transparent']
                                })}
                                onPress={() => navigation.navigate("HomeworkTab")}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                                    {/* Neon Indicator */}
                                    <View style={{
                                        width: 3,
                                        height: 36,
                                        backgroundColor: hw.color || '#a78bfa',
                                        borderRadius: 2,
                                        marginRight: 14,
                                        shadowColor: hw.color || '#a78bfa',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 6,
                                        elevation: 5
                                    }} />

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onSurface, fontSize: 16, fontWeight: '700', marginBottom: 3 }}>
                                            {hw.subjectTitle || hw.subject}
                                        </Text>
                                        <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.6)' : theme.colors.onSurfaceDisabled, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                                            {hw.description || 'Voir le contenu...'}
                                        </Text>
                                    </View>

                                    <View style={{
                                        backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <Text style={{ color: '#c4b5fd', fontSize: 11, fontWeight: '700' }}>
                                            {formatDate(hw.date)}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        ))
                    ) : (
                        <GlassCard style={{ paddingVertical: 30, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280', fontSize: 15 }}>Aucun devoir à venir ✨</Text>
                        </GlassCard>
                    )}
                </View>

                {/* Recent Messages */}
                <View style={{ paddingHorizontal: 20, marginBottom: insets.bottom + 30 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Text style={{ color: theme.colors.onBackground, fontSize: 20, fontWeight: '800' }}>💬 Messages récents</Text>
                        <TouchableOpacity onPress={() => AdsHandler.showInterstitialAd(() => navigation.navigate("MessageriePage"), 'message')}>
                            <Text style={{ color: '#a78bfa', fontSize: 14, fontWeight: '600' }}>Ouvrir →</Text>
                        </TouchableOpacity>
                    </View>

                    {recentMessages.length > 0 ? (
                        recentMessages.map((msg, index) => (
                            <GlassCard
                                key={index}
                                style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}
                                gradient={theme.dark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['#FFFFFF', '#FFFFFF']}
                                onPress={() => navigation.navigate("MessageDetailsPage", { message: msg })}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                                    {/* Neon Avatar/Icon */}
                                    <View style={{
                                        width: 42, height: 42,
                                        borderRadius: 21,
                                        backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                        alignItems: 'center', justifyContent: 'center',
                                        borderWidth: 1, borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        marginRight: 14
                                    }}>
                                        <Mail color={theme.dark ? "#FFFFFF" : "#ec4899"} size={20} strokeWidth={2} />
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
                                            {msg.from?.name || msg.from?.nom || msg.expediteur?.nom || msg.expediteur || "Inconnu"}
                                        </Text>
                                        <Text style={{ color: theme.dark ? 'rgba(255,255,255,0.6)' : theme.colors.onSurfaceDisabled, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                                            {msg.subject || msg.objet || "Sans objet"}
                                        </Text>
                                    </View>

                                    <View style={{
                                        alignItems: 'flex-end', marginLeft: 8
                                    }}>
                                        <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600' }}>
                                            {formatDate(msg.date)}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        ))
                    ) : (
                        <GlassCard style={{ paddingVertical: 30, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280', fontSize: 15 }}>Aucun message récent 📭</Text>
                        </GlassCard>
                    )}
                </View>
                <BannerAdComponent placement="home" />
            </ScrollView>
        </View>
    );
}
