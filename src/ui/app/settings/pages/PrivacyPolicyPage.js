import { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ChevronLeftIcon,
    ShieldCheckIcon,
    LockIcon,
    EyeOffIcon,
    DatabaseIcon,
    GlobeIcon,
    CreditCardIcon,
    GithubIcon,
    MailIcon
} from "lucide-react-native";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";

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

// Section Component
const PrivacySection = ({ icon: Icon, title, content, theme, isLast }) => (
    <View style={{
        marginBottom: isLast ? 0 : 25,
        flexDirection: 'row',
    }}>
        <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: theme.colors.primary + '15',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 15,
            borderWidth: 1, borderColor: theme.colors.primary + '30'
        }}>
            <Icon size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ color: theme.dark ? '#FFF' : '#1E293B', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 6 }}>
                {title}
            </Text>
            <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 14, fontFamily: 'Text-Medium', lineHeight: 22 }}>
                {content}
            </Text>
        </View>
    </View>
);

function PrivacyPolicyPage({ navigation }) {
    const { theme } = useGlobalAppContext();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="Confidentialité" onBack={() => navigation.pop()} theme={theme} />

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

                    {/* Hero Branding */}
                    <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <View style={{
                            padding: 15, borderRadius: 20,
                            backgroundColor: theme.dark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                            borderWidth: 1, borderColor: '#10B981',
                            marginBottom: 15
                        }}>
                            <ShieldCheckIcon size={40} color="#10B981" />
                        </View>
                        <Text style={{ color: theme.dark ? '#FFF' : '#1E293B', fontSize: 22, fontFamily: 'Text-Bold', fontWeight: 'bold', textAlign: 'center' }}>
                            Votre sécurité est notre priorité
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 5 }}>
                            Dernière mise à jour : 9 février 2026
                        </Text>
                    </View>

                    {/* Main Content Card */}
                    <View style={{
                        backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF',
                        borderRadius: 24,
                        padding: 24,
                        borderWidth: 1,
                        borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
                    }}>

                        <PrivacySection
                            theme={theme}
                            icon={EyeOffIcon}
                            title="Zéro collecte de données"
                            content="NotiaNote n'utilise aucun serveur de stockage. Vos notes, messages et devoirs ne transitent jamais par nous."
                        />

                        <PrivacySection
                            theme={theme}
                            icon={DatabaseIcon}
                            title="Stockage 100% Local"
                            content="Toutes vos informations scolaires sont stockées exclusivement sur votre téléphone dans un espace sécurisé."
                        />

                        <PrivacySection
                            theme={theme}
                            icon={LockIcon}
                            title="Chiffrement de bout en bout"
                            content="La communication avec ÉcoleDirecte se fait via une connexion HTTPS chiffrée, comme une banque."
                        />

                        <PrivacySection
                            theme={theme}
                            icon={GlobeIcon}
                            title="Biométrie locale"
                            content="FaceID ou TouchID sont gérés par votre smartphone. L'app n'a jamais accès à vos empreintes ou votre visage."
                        />

                        <PrivacySection
                            theme={theme}
                            icon={CreditCardIcon}
                            title="Publicité Respectueuse"
                            content="Les publicités financent le projet sans jamais accéder à vos données scolaires. Tout reste anonyme."
                        />

                        <PrivacySection
                            theme={theme}
                            icon={GithubIcon}
                            title="Transparence Open Source"
                            content="Le code source de l'application est public et auditable par n'importe qui sur GitHub."
                            isLast
                        />
                    </View>

                    {/* Contact Button */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate("ContactPage")}
                        style={{
                            marginTop: 30,
                            backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            padding: 20, borderRadius: 20,
                            flexDirection: 'row', alignItems: 'center',
                            borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }}
                    >
                        <View style={{ padding: 10, backgroundColor: '#3B82F615', borderRadius: 12, marginRight: 15 }}>
                            <MailIcon size={20} color="#3B82F6" />
                        </View>
                        <View>
                            <Text style={{ color: theme.dark ? '#FFF' : '#1E293B', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Une question ?</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 13 }}>Nous sommes là pour vous répondre.</Text>
                        </View>
                    </TouchableOpacity>

                </ScrollView>
            </LinearGradient>
        </View>
    );
}

export default memo(PrivacyPolicyPage);
