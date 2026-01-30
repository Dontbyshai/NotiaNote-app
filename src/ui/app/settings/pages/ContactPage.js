import { memo } from "react";
import { View, Text, TouchableOpacity, Linking, Alert, Clipboard, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon, MailIcon, CopyIcon, ExternalLinkIcon } from "lucide-react-native";
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

function ContactPage({ navigation }) {
    const email = "dontbyshai@gmail.com";

    const handleCopy = () => {
        Clipboard.setString(email);
        Alert.alert("Copié", "L'adresse email a été copiée dans le presse-papier.");
    };

    const openAppleMail = () => {
        Linking.openURL(`mailto:${email}?subject=Contact NotiaNote&body=Bonjour,`);
    };

    const openGmail = async () => {
        const gmailUrl = `googlegmail:///co?to=${email}&subject=Contact NotiaNote&body=Bonjour,`;
        const canOpen = await Linking.canOpenURL(gmailUrl);

        if (canOpen) {
            Linking.openURL(gmailUrl);
        } else {
            // Fallback to web browser or default mailto
            Alert.alert(
                "Gmail non trouvé",
                "L'application Gmail n'est pas installée. Ouverture de l'application mail par défaut.",
                [{ text: "OK", onPress: openAppleMail }]
            );
        }
    };

    const { theme } = useGlobalAppContext();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.background]}
                style={{ flex: 1 }}
            >
                <GalaxyHeader title="Nous contacter" onBack={() => navigation.pop()} theme={theme} />

                <View style={{ padding: 20, alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 100 }}>

                    <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: theme.colors.primary + '1A', // 10% opacity
                        alignItems: 'center', justifyContent: 'center', marginBottom: 30,
                        borderWidth: 1, borderColor: theme.colors.primary,
                        shadowColor: theme.colors.primary, shadowRadius: 20, shadowOpacity: 0.3
                    }}>
                        <MailIcon size={50} color={theme.colors.primary} />
                    </View>

                    <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 22, fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                        Une question ?
                    </Text>

                    <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 15, fontFamily: 'Text-Medium', textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
                        N'hésitez pas à nous écrire pour toute suggestion, rapport de bug ou simple message !
                    </Text>

                    {/* Email Display */}
                    <TouchableOpacity
                        onPress={handleCopy}
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF', padding: 15, borderRadius: 16,
                            borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', marginBottom: 40,
                            shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
                        }}
                    >
                        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontFamily: 'Text-Bold', marginRight: 15 }}>{email}</Text>
                        <CopyIcon size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Shortcuts */}
                    <View style={{ width: '100%', gap: 15 }}>
                        <TouchableOpacity
                            onPress={openAppleMail}
                            style={{
                                backgroundColor: '#3B82F6', // Blue for Mail
                                paddingVertical: 15, borderRadius: 16, alignItems: 'center',
                                shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 8
                            }}
                        >
                            <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Ouvrir Apple Mail</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={openGmail}
                            style={{
                                backgroundColor: '#EA4335', // Red for Gmail
                                paddingVertical: 15, borderRadius: 16, alignItems: 'center',
                                shadowColor: '#EA4335', shadowOpacity: 0.3, shadowRadius: 8
                            }}
                        >
                            <Text style={{ color: '#FFF', fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Ouvrir Gmail</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </LinearGradient>
        </View>
    );
}

export default memo(ContactPage);
