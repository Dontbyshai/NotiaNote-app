import { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon, GlobeIcon, GithubIcon, MailIcon } from "lucide-react-native";
import Constants from 'expo-constants';
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

function AboutPage({ navigation }) {
    const { theme } = useGlobalAppContext();
    const handleLink = (url) => Linking.openURL(url);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="À propos" onBack={() => navigation.pop()} theme={theme} />

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>

                    {/* Header Logo */}
                    <View style={{ alignItems: 'center', marginBottom: 30 }}>
                        <View style={{
                            width: 100, height: 100, borderRadius: 25,
                            backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            alignItems: 'center', justifyContent: 'center', marginBottom: 15,
                            borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                        }}>
                            {/* Assuming we have a logo asset, else using text as placeholder */}
                            <Text style={{ fontSize: 40 }}>🪐</Text>
                        </View>
                        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 28, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>NotiaNote</Text>
                        <Text style={{ color: theme.dark ? '#FFFFFF' : theme.colors.primaryLight, fontSize: 16, fontFamily: 'Text-Medium' }}>
                            v2.1.2 Premium
                        </Text>
                    </View>

                    {/* Branding */}
                    <TouchableOpacity onPress={() => handleLink("https://shaiscompany.com")} style={{ alignItems: 'center', marginBottom: 30 }}>
                        <Text style={{ color: theme.dark ? '#FFFFFF' : '#1E293B', fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '600' }}>
                            Propulsé par <Text style={{ color: theme.dark ? '#FFFFFF' : '#1E293B', textDecorationLine: 'underline' }}>Shai's Company</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Features Section */}
                    <View style={[styles.card, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>🚀 Nouveautés v2.1.2</Text>

                        <Text style={[styles.subTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>⌨️ Clavier Optimisé</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Le formulaire de connexion s'adapte intelligemment au clavier pour garder tous les champs visibles pendant la saisie.
                        </Text>

                        <Text style={[styles.subTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>🍽️ Protection Cantine</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Confirmation avant de réinitialiser votre code personnalisé pour éviter les fausses manipulations.
                        </Text>

                        <Text style={[styles.subTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>⚙️ Interface Épurée</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Nettoyage des paramètres avec suppression des outils de diagnostic et messages informatifs pour les fonctionnalités à venir.
                        </Text>

                        <Text style={[styles.subTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>🔧 Stabilité Améliorée</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Rafraîchissement automatique de session et optimisation du système de notifications en arrière-plan.
                        </Text>
                    </View>

                    {/* Links */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 30 }}>
                        <TouchableOpacity onPress={() => handleLink("https://notianote.fr")} style={styles.socialBtn}>
                            <GlobeIcon color={theme.dark ? "#FFF" : theme.colors.onBackground} size={24} />
                            <Text style={[styles.socialText, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>Site Web</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleLink("https://github.com/Dontbyshai/NotiaNote")} style={styles.socialBtn}>
                            <GithubIcon color={theme.dark ? "#FFF" : theme.colors.onBackground} size={24} />
                            <Text style={[styles.socialText, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>GitHub</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate("ContactPage")} style={styles.socialBtn}>
                            <MailIcon color={theme.dark ? "#FFF" : theme.colors.onBackground} size={24} />
                            <Text style={[styles.socialText, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>Contact</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Credits */}
                    <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12 }}>
                        Créé par dontbyshai{'\n'}
                        Propulsé par Shai's Company{'\n'}
                        Projet open-source non-affilié officiellement à Aplim.
                    </Text>

                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = {
    card: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)', borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20
    },
    sectionTitle: {
        color: '#FFF', fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 15
    },
    subTitle: {
        color: '#FFF', fontSize: 15, fontFamily: 'Text-Bold', fontWeight: 'bold', marginTop: 15, marginBottom: 5
    },
    paragraph: {
        color: '#CBD5E1', fontSize: 14, fontFamily: 'Text-Medium', lineHeight: 22, textAlign: 'justify'
    },
    socialBtn: {
        alignItems: 'center', padding: 10
    },
    socialText: {
        color: '#FFF', marginTop: 5, fontSize: 12
    }
}

export default memo(AboutPage);
