import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, GraduationCap, Clock, AlertTriangle, MessageSquare, Info, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import EcoleDirecteApi from '../../../services/EcoleDirecteApi';
import BannerAdComponent from '../../components/Ads/BannerAdComponent';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export default function SchoolLifePage() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { accountID: contextAccountID, mainAccount } = useCurrentAccountContext();
    // Fix: Calculate effective ID to handle cases where contextAccountID is undefined
    const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);
    const { theme } = useGlobalAppContext();
    const [loading, setLoading] = useState(true);

    // Data States
    const [absences, setAbsences] = useState([]);
    const [delays, setDelays] = useState([]);
    const [sanctions, setSanctions] = useState([]);
    const [incidents, setIncidents] = useState([]);

    const [selectedTab, setSelectedTab] = useState('absences'); // absences, delays, sanctions, incidents
    const [expandedItem, setExpandedItem] = useState(null);

    useEffect(() => {
        loadSchoolLife();
    }, [accountID]);

    const loadSchoolLife = async () => {
        setLoading(true);
        try {
            const response = await EcoleDirecteApi.getSchoolLife(accountID);
            if (response.status === 200) {
                // IMPORTANT: EcoleDirecte payload is usually inside response.data.data
                // response.data is the axios payload { code: 200, data: {...} }
                const payload = response.data.data || response.data;
                console.log("[SchoolLife] Payload keys:", Object.keys(payload));
                if (payload.absencesRetards) console.log("[SchoolLife] Absences/Retards count:", payload.absencesRetards.length);
                if (payload.sanctionsEncouragements) console.log("[SchoolLife] Sanctions count:", payload.sanctionsEncouragements.length);
                processData(payload);
            } else {
                console.warn("SchoolLife fetch failed:", response);
            }
        } catch (e) {
            console.error("SchoolLife Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const processData = (data) => {
        const newAbsences = [];
        const newDelays = [];
        const newSanctions = [];
        const newIncidents = [];

        // Absences & Retards
        if (data.absencesRetards) {
            if (data.absencesRetards.length > 0) {
                console.log("[SchoolLife] Item structure:", Object.keys(data.absencesRetards[0]));
            }
            data.absencesRetards.forEach(item => {
                console.log(`[SchoolLife] Processing item type: '${item.typeElement}'`);
                const formatted = { ...item, type: item.typeElement };
                if (item.typeElement === "Retard") {
                    newDelays.push(formatted);
                } else if (item.typeElement === "Absence") {
                    newAbsences.push(formatted);
                }
            });
        }

        // Sanctions & Incidents
        if (data.sanctionsEncouragements) {
            data.sanctionsEncouragements.forEach(item => {
                const formatted = { ...item, type: item.typeElement };
                if (item.typeElement === "Punition" || item.typeElement === "Sanction") {
                    newSanctions.push(formatted);
                } else if (item.typeElement === "Incident") {
                    newIncidents.push(formatted);
                }
            });
        }

        setAbsences(newAbsences);
        setDelays(newDelays);
        setSanctions(newSanctions);
        setIncidents(newIncidents);
    };

    const toggleItem = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedItem(expandedItem === id ? null : id);
    };

    const getCurrentList = () => {
        switch (selectedTab) {
            case 'absences': return absences;
            case 'delays': return delays;
            case 'sanctions': return sanctions;
            case 'incidents': return incidents;
            default: return [];
        }
    };

    const getTabColor = (tab) => {
        switch (tab) {
            case 'absences': return '#F59E0B'; // Orange
            case 'delays': return '#EF4444'; // Red
            case 'sanctions': return '#8B5CF6'; // Purple
            case 'incidents': return '#3B82F6'; // Blue
            default: return '#94A3B8';
        }
    };

    const StatsCard = ({ icon: Icon, title, count, color, tabName }) => {
        const isActive = selectedTab === tabName;
        return (
            <TouchableOpacity
                onPress={() => setSelectedTab(tabName)}
                style={{
                    flex: 1,
                    backgroundColor: isActive ? `${color}20` : (theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'),
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: isActive ? color : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    minHeight: 100,
                    justifyContent: 'space-between',
                    shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 5, elevation: isActive ? 0 : 2
                }}>
                <View style={{
                    width: 32, height: 32,
                    borderRadius: 10,
                    backgroundColor: isActive ? color : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                    justifyContent: 'center', alignItems: 'center'
                }}>
                    <Icon color={isActive ? '#FFF' : color} size={18} />
                </View>
                <View>
                    <Text style={{ color: isActive ? (theme.dark ? '#FFF' : color) : (theme.dark ? '#E2E8F0' : theme.colors.onSurface), fontSize: 24, fontWeight: 'bold' }}>{count}</Text>
                    <Text style={{ color: isActive ? color : '#94A3B8', fontSize: 12, fontWeight: '600' }}>{title}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderItem = (item, index) => {
        const isExpanded = expandedItem === item.id;
        const color = getTabColor(selectedTab);

        return (
            <TouchableOpacity
                key={item.id || index}
                activeOpacity={0.9}
                onPress={() => toggleItem(item.id)}
                style={{
                    marginBottom: 10,
                    backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                    borderRadius: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: item.justifie ? '#10B981' : color,
                    borderWidth: 1,
                    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    overflow: 'visible',
                    shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 4, elevation: 1
                }}
            >
                <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ color: color, fontWeight: 'bold', fontSize: 13, marginRight: 8 }}>
                                {item.typeElement}
                            </Text>
                            {item.justifie && (
                                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: 'bold' }}>JUSTIFIÉ</Text>
                                </View>
                            )}
                            {!item.justifie && (
                                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold' }}>NON JUSTIFIÉ</Text>
                                </View>
                            )}
                        </View>
                        <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onSurface, fontSize: 15, fontWeight: '600', marginBottom: 2 }}>{item.libelle}</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 13 }}>{item.displayDate}</Text>
                    </View>
                    {isExpanded ? <ChevronUp color="#64748B" size={20} /> : <ChevronDown color="#64748B" size={20} />}
                </View>

                {isExpanded && (
                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                        <View style={{ marginTop: 12 }}>
                            {item.motif && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Motif</Text>
                                    <Text style={{ color: '#E2E8F0', fontSize: 14 }}>{item.motif}</Text>
                                </View>
                            )}
                            {item.commentaire && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>Commentaire</Text>
                                    <Text style={{ color: '#E2E8F0', fontSize: 14 }}>{item.commentaire}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient colors={[theme.colors.primaryLight, theme.colors.background]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ ...styles.backButton, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                    <ChevronLeft color={theme.dark ? "#FFF" : theme.colors.onBackground} size={28} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.onBackground }}>Vie Scolaire</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadSchoolLife} tintColor={theme.colors.primary} />
                }
            >
                {/* Stats Grid */}
                <View style={styles.grid}>
                    <View style={styles.row}>
                        <StatsCard
                            icon={Clock}
                            title="Absences"
                            count={absences.length}
                            color="#F59E0B"
                            tabName="absences"
                        />
                        <View style={{ width: 12 }} />
                        <StatsCard
                            icon={AlertTriangle}
                            title="Retards"
                            count={delays.length}
                            color="#EF4444"
                            tabName="delays"
                        />
                    </View>
                    <View style={{ height: 12 }} />
                    <View style={styles.row}>
                        <StatsCard
                            icon={MessageSquare}
                            title="Sanctions"
                            count={sanctions.length}
                            color="#8B5CF6"
                            tabName="sanctions"
                        />
                        <View style={{ width: 12 }} />
                        <StatsCard
                            icon={Info}
                            title="Incidents"
                            count={incidents.length}
                            color="#3B82F6"
                            tabName="incidents"
                        />
                    </View>
                </View>

                {/* Selected List */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: theme.colors.onBackground, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                        {selectedTab === 'absences' ? 'Vos Absences' :
                            selectedTab === 'delays' ? 'Vos Retards' :
                                selectedTab === 'sanctions' ? 'Vos Sanctions' : 'Vos Incidents'}
                    </Text>

                    {getCurrentList().length > 0 ? (
                        getCurrentList().map((item, index) => renderItem(item, index))
                    ) : (
                        <View style={styles.emptyState}>
                            <Info size={40} color="#64748B" />
                            <Text style={styles.emptyText}>Rien à signaler. C'est parfait !</Text>
                        </View>
                    )}
                </View>

                {/* Banner Ad at bottom */}
                <BannerAdComponent placement="schoollife" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 20,
    },
    backButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    content: { padding: 20 },
    grid: { marginBottom: 30 },
    row: { flexDirection: 'row' },
    emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { color: '#94A3B8', marginTop: 12, fontSize: 16 }
});
