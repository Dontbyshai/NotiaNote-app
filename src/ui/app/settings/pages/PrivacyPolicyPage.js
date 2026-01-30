import { memo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon } from "lucide-react-native";
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
                    {/* Content */}
                    <View style={{
                        backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, padding: 20,
                        borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
                    }}>
                        <Text style={{ color: theme.dark ? '#E2E8F0' : '#64748B', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                            Dernière mise à jour : 25 janvier 2026
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>1. Introduction</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            NotiaNote est un service gratuit et open source qui vous permet d'accéder à vos données EcoleDirecte avec une interface moderne et améliorée. La protection de votre vie privée est le fondement même de cette application.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>2. Collecte de données</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            NotiaNote ne collecte AUCUNE donnée personnelle. Nous ne possédons aucun serveur de stockage pour vos informations.
                            Toutes vos données (notes, messages, devoirs) sont stockées localement sur votre appareil. L'application communique directement avec l'API officielle d'EcoleDirecte.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>3. Biométrie et Sécurité d'Accès</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Si vous activez le verrouillage par biométrie (FaceID / TouchID), l'authentification est gérée par le système d'exploitation de votre téléphone. NotiaNote n'a jamais accès à vos données biométriques (empreintes ou visage), qui restent sécurisées dans l'enclave protégée de votre appareil.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>4. Utilisation de l'API EcoleDirecte</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Vos identifiants sont transmis directement à EcoleDirecte via une connexion chiffrée (HTTPS).
                            Nous ne sommes pas affiliés à Aplim (éditeur d'EcoleDirecte) et n'avons aucun accès à vos comptes en dehors de ce que vous voyez dans l'application.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>5. Stockage local et Cache</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Les données stockées localement sont :
                            {'\n'}- Vos préférences d'affichage et thèmes
                            {'\n'}- Vos jetons de session (Tokens) chiffrés
                            {'\n'}- Un cache local de vos données scolaires et photos de profil
                            {'\n'}Ces données sont supprimées dès que vous vous déconnectez ou via les options de nettoyage dans les paramètres Avancés.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>6. Publicité et Cookies</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            NotiaNote affiche des publicités pour financer le projet. Celles-ci utilisent des identifiants publicitaires anonymes gérés par votre téléphone. Aucune donnée scolaire n'est transmise aux régies publicitaires.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>7. Open Source</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Le code de NotiaNote est public et auditable par n'importe qui sur GitHub. C'est la meilleure garantie de notre transparence totale envers les utilisateurs.
                        </Text>

                        <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : theme.colors.onBackground }]}>8. Contact</Text>
                        <Text style={[styles.paragraph, { color: theme.dark ? '#CBD5E1' : '#475569' }]}>
                            Pour toute question : dontbyshai@gmail.com
                        </Text>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = {
    sectionTitle: {
        color: '#FFF', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold', marginTop: 15, marginBottom: 8
    },
    paragraph: {
        color: '#CBD5E1', fontSize: 14, fontFamily: 'Text-Medium', lineHeight: 22, textAlign: 'justify'
    }
}

export default memo(PrivacyPolicyPage);
