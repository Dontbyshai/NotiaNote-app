import { memo, useState, useEffect } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ChevronLeftIcon,
    ShieldCheckIcon,
    TrendingUpIcon,
    CalendarDaysIcon,
    FingerprintIcon,
    EyeIcon
} from "lucide-react-native";

import AccountHandler from "../../../../core/AccountHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import StorageHandler from "../../../../core/StorageHandler";
import MarksHandler from "../../../../core/MarksHandler";

// Helper Header
const GalaxyHeader = ({ title, onBack, theme }) => {
    const insets = useSafeAreaInsets();
    const topPadding = Platform.OS === 'android' ? insets.top + 25 : insets.top;
    return (
        <View style={{ paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 20 }}>
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
                    <ChevronLeftIcon size={24} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
                </TouchableOpacity>
                <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 20, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>{title}</Text>
            </View>
        </View>
    );
};

// Helper for Item
const SecurityItem = ({ title, subtitle, icon, rightElement, color, theme, onPress }) => (
    <TouchableOpacity
        disabled={!onPress}
        onPress={onPress}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 15,
            borderBottomWidth: 1,
            borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}
    >
        <View style={{
            width: 40, height: 40, borderRadius: 10,
            backgroundColor: (color || '#FFF') + '20',
            alignItems: 'center', justifyContent: 'center', marginRight: 15
        }}>
            {icon}
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: '600' }}>{title}</Text>
            {subtitle && <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium', marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {rightElement}
    </TouchableOpacity>
);

function SecurityPrivacyPage({ navigation }) {
    const { theme } = useGlobalAppContext();
    const { updateGlobalDisplay } = useAppStackContext();

    // Settings State
    const [useBioAuth, setUseBioAuth] = useState(false);
    const [showEvolutionArrows, setShowEvolutionArrows] = useState(true);
    const [autoTrimestre, setAutoTrimestre] = useState(true);
    const [widgetAverageType, setWidgetAverageType] = useState('AUTO'); // AUTO, YEAR, A001, A002, A003
    const [showCantineWidget, setShowCantineWidget] = useState(true);

    const [availablePeriods, setAvailablePeriods] = useState([]);

    useEffect(() => {
        const loadSettings = async () => {
            setUseBioAuth(await AccountHandler.getPreference("security_bio_auth", false));
            setShowEvolutionArrows(await AccountHandler.getPreference("ui_show_evolution_arrows", true));
            setAutoTrimestre(await AccountHandler.getPreference("logic_auto_trimestre", true));
            setWidgetAverageType(await AccountHandler.getPreference("widget_average_type", 'AUTO'));
            setShowCantineWidget(await AccountHandler.getPreference("widget_show_cantine", true));

            // Load available periods for the list
            const marks = await StorageHandler.getData("marks");
            if (marks && marks[accountID]?.data) {
                const p = Object.values(marks[accountID].data)
                    .filter(item => item.id !== "YEAR")
                    .map(item => ({ id: item.id, title: item.title }));
                setAvailablePeriods(p);
            }
        };
        loadSettings();
    }, [accountID]);

    const updatePref = async (key, val, setter) => {
        setter(val);
        await AccountHandler.setPreference(key, val);
        updateGlobalDisplay();
    };


    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="Sécurité & Vie Privée" onBack={() => navigation.pop()} theme={theme} />

                <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>

                    <Text style={styles.sectionTitle}>PROTECTION DE L'ACCÈS</Text>
                    <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <SecurityItem
                            theme={theme}
                            title="Verrouillage App"
                            subtitle="FaceID / TouchID au démarrage."
                            icon={<FingerprintIcon size={20} color="#10B981" />}
                            color="#10B981"
                            rightElement={
                                <Switch
                                    value={useBioAuth}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("security_bio_auth", v, setUseBioAuth)}
                                />
                            }
                        />
                    </View>

                    <Text style={styles.sectionTitle}>PRÉFÉRENCES D'AFFICHAGE</Text>
                    <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <SecurityItem
                            theme={theme}
                            title="Flèches d'évolution"
                            subtitle="Afficher ↑/↓ sur les moyennes."
                            icon={<TrendingUpIcon size={20} color="#3B82F6" />}
                            color="#3B82F6"
                            rightElement={
                                <Switch
                                    value={showEvolutionArrows}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("ui_show_evolution_arrows", v, setShowEvolutionArrows)}
                                />
                            }
                        />
                        <SecurityItem
                            theme={theme}
                            title="Trimestre Automatique"
                            subtitle="Toujours ouvrir le trimestre en cours."
                            icon={<CalendarDaysIcon size={20} color="#8B5CF6" />}
                            color="#8B5CF6"
                            rightElement={
                                <Switch
                                    value={autoTrimestre}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("logic_auto_trimestre", v, setAutoTrimestre)}
                                />
                            }
                        />
                    </View>

                    <Text style={styles.sectionTitle}>WIDGETS (ÉCRAN D'ACCUEIL)</Text>
                    <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <TouchableOpacity
                            onPress={() => {
                                const options = [
                                    { id: 'AUTO', title: 'Automatique (Actuel)' },
                                    { id: 'YEAR', title: 'Moyenne de l\'Année' },
                                    ...availablePeriods
                                ];

                                Alert.alert(
                                    "Moyenne du Widget",
                                    "Choisissez quelle moyenne afficher sur l'écran d'accueil :",
                                    options.map(opt => ({
                                        text: opt.title,
                                        onPress: () => updatePref("widget_average_type", opt.id, setWidgetAverageType)
                                    })).concat([{ text: "Annuler", style: "cancel" }])
                                );
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 15,
                                paddingHorizontal: 15,
                                borderBottomWidth: 1,
                                borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            }}
                        >
                            <View style={{
                                width: 40, height: 40, borderRadius: 10,
                                backgroundColor: '#F59E0B20',
                                alignItems: 'center', justifyContent: 'center', marginRight: 15
                            }}>
                                <TrendingUpIcon size={20} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: '600' }}>Type de moyenne</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium', marginTop: 2 }}>
                                    {widgetAverageType === 'AUTO' ? 'Automatique' : (widgetAverageType === 'YEAR' ? 'Année' : (availablePeriods.find(p => p.id === widgetAverageType)?.title || 'Sélectionner...'))}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <SecurityItem
                            theme={theme}
                            title="Badge de Cantine"
                            subtitle="Afficher le code-barres sur le widget."
                            icon={<ShieldCheckIcon size={20} color="#F43F5E" />}
                            color="#F43F5E"
                            rightElement={
                                <Switch
                                    value={showCantineWidget}
                                    trackColor={{ false: "#334155", true: theme.colors.primary }}
                                    thumbColor={"#FFF"}
                                    onValueChange={(v) => updatePref("widget_show_cantine", v, setShowCantineWidget)}
                                />
                            }
                        />
                    </View>

                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = {
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 12,
        marginBottom: 10,
        fontFamily: 'Text-Bold',
        letterSpacing: 1,
        marginTop: 25,
        marginLeft: 5
    },
    cardContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    }
};

export default memo(SecurityPrivacyPage);
