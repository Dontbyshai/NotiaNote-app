import { memo, useState, useEffect } from "react";
import { View, Text, Platform, Dimensions, TouchableOpacity, Alert, ScrollView, Linking, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PaletteIcon,
  BookOpenIcon,
  LogOutIcon,
  InfoIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Settings2Icon,
  BadgeHelpIcon,
  BugIcon,
  LockIcon,
  MailIcon,
  Wifi,
  RefreshCw,
  BellIcon,
  ShieldCheckIcon
} from "lucide-react-native";

import CustomProfilePhoto from "../../components/CustomProfilePhoto";
import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import AccountHandler from "../../../core/AccountHandler";
import StorageHandler from "../../../core/StorageHandler";
import { Themes } from "../../../util/Styles";
import CustomSection from "../../components/CustomSection";

// Helper for Header
const GalaxyHeader = ({ title, onBack, theme }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 40 : 15), paddingHorizontal: 20, paddingBottom: 15 }}>
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

function SettingsPage({ navigation }) {
  const { theme, setIsLoggedIn, changeTheme } = useGlobalAppContext();
  const { mainAccount } = useCurrentAccountContext();
  const insets = useSafeAreaInsets();

  // Exception: Keep original colorful icons for Default Violet, Light Theme, and Deep Black
  // Violet/Light use #8B5CF6. Deep Black uses #FAFAFA.
  const isCosmic = theme.colors.primary === '#8B5CF6' || theme.colors.primary === '#FAFAFA';

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [mainAccount]);

  const checkConnection = async () => {
    setChecking(true);
    setConnectionStatus('checking');
    try {
      const result = await AccountHandler.refreshLogin();
      if (result === 1) {
        setConnectionStatus('connected');
      } else {
        console.log("Refresh Login failed with status:", result);
        setConnectionStatus('disconnected');
      }
    } catch (e) {
      console.error(e);
      setConnectionStatus('disconnected');
    } finally {
      setChecking(false);
    }
  };

  // Helper for settings item row
  const SettingsItem = ({ icon, title, subtitle, onPress, isLast, color }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', // Dynamic
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: (color || theme.colors.primary) + '20',
        alignItems: 'center', justifyContent: 'center', marginRight: 15
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: '600' }}>{title}</Text>
        {subtitle && <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium' }}>{subtitle}</Text>}
      </View>
      <ChevronRightIcon size={20} color="#64748B" />
    </TouchableOpacity>
  );

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter", style: "destructive", onPress: async () => {
            // Reset Theme to Default (Cosmic Violet)
            changeTheme(Themes.VioletCosmique);
            await StorageHandler.saveData("theme", null); // Clear saved theme

            await AccountHandler.eraseData();
            setIsLoggedIn(false);
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]} // Theme Gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Paramètres" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>

          {/* Profile Card */}
          <TouchableOpacity
            onPress={() => navigation.navigate("ProfilePage")}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF',
              borderRadius: 24,
              padding: 20,
              alignItems: 'center',
              marginTop: 20,
              marginBottom: 30,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
            }}>
            <View style={{ marginBottom: 15 }}>
              <CustomProfilePhoto accountID={mainAccount?.id} size={90} />
            </View>

            <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 22, fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 5 }}>
              {mainAccount?.firstName ? `${mainAccount.firstName} ${mainAccount.lastName || ''}` : ''}
            </Text>

            <View style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginBottom: 20
            }}>
              <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium' }}>
                {mainAccount?.grade || 'Chargement...'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("ProfilePage")}
              style={{
                backgroundColor: theme.colors.primary + '1A',
                paddingVertical: 12,
                paddingHorizontal: 25,
                borderRadius: 14,
                width: '100%',
                alignItems: 'center',
                marginBottom: 15,
                borderWidth: 1,
                borderColor: theme.colors.primary + '33',
              }}
            >
              <Text style={{ color: theme.colors.primary, fontFamily: 'Text-Bold', fontWeight: 'bold', fontSize: 15 }}>Voir mon profil</Text>
            </TouchableOpacity>

            {/* Connection Status & Reload */}
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Wifi size={16} color={connectionStatus === 'connected' ? "#4ADE80" : (connectionStatus === 'disconnected' ? "#EF4444" : "#94A3B8")} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.dark ? '#CBD5E1' : '#64748B', fontSize: 12, fontFamily: 'Text-Medium' }}>
                  {checking ? "Vérification..." : (connectionStatus === 'connected' ? "Connecté" : "Etat inconnu")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => checkConnection()}
                disabled={checking}
                style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', padding: 6, borderRadius: 8 }}
              >
                {checking ? <ActivityIndicator size="small" color={theme.dark ? "#FFF" : "#000"} /> : <RefreshCw size={16} color={theme.dark ? "#FFF" : "#000"} />}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>



          {/* Section 1: PERSONNALISATION */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>PERSONNALISATION</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <SettingsItem
              icon={<PaletteIcon size={22} color="#F59E0B" />}
              title="Apparence"
              subtitle="Thèmes & Logos"
              onPress={() => navigation.navigate("AppearancePage")}
              color="#F59E0B"
            />
            <SettingsItem
              icon={<BookOpenIcon size={22} color="#10B981" />}
              title="Matières & Couleurs"
              subtitle="Personnaliser l'affichage"
              onPress={() => navigation.navigate("CoefficientsPage")}
              isLast
              color="#10B981"
            />
          </View>

          {/* Section 2: APPLICATION (Avancé, Pubs) */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>APPLICATION</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <SettingsItem
              icon={<Settings2Icon size={22} color="#8B5CF6" />}
              title="Avancé"
              onPress={() => navigation.navigate('AdvancedSettingsPage')}
              color="#8B5CF6"
            />
            <SettingsItem
              icon={<BellIcon size={22} color="#3B82F6" />}
              title="Notifications"
              onPress={() => navigation.navigate('NotificationsPage')}
              color="#3B82F6"
            />
            <SettingsItem
              icon={<BadgeHelpIcon size={22} color="#06B6D4" />}
              title="Publicité"
              onPress={() => navigation.navigate('AdsInformationPage')}
              color="#06B6D4"
              isLast
            />
          </View>

          {/* Section 3: AIDE & INFORMATIONS (Bug, Privacy, Contact, About) */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>AIDE & INFORMATIONS</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <SettingsItem
              icon={<BugIcon size={22} color="#EF4444" />}
              title="Signaler un bug"
              onPress={() => navigation.navigate('BugReportPage')}
              color="#EF4444"
            />
            <SettingsItem
              icon={<LockIcon size={22} color="#10B981" />}
              title="Confidentialité"
              onPress={() => navigation.navigate('PrivacyPolicyPage')}
              color="#10B981"
            />
            <SettingsItem
              icon={<MailIcon size={22} color="#F59E0B" />}
              title="Nous contacter"
              onPress={() => navigation.navigate('ContactPage')}
              color="#F59E0B"
            />
            <SettingsItem
              icon={<InfoIcon size={22} color="#3B82F6" />}
              title="À propos de NotiaNote"
              subtitle="v2.1.0 - Premium Edition"
              onPress={() => navigation.navigate("AboutPage")}
              color="#3B82F6"
              isLast
            />
          </View>

          {/* Section 4: ACCÈS & SÉCURITÉ */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>ACCÈS & SÉCURITÉ</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <SettingsItem
              icon={<ShieldCheckIcon size={22} color="#10B981" />}
              title="Sécurité & Vie Privée"
              subtitle="FaceID, Affichage"
              onPress={() => navigation.navigate('SecurityPrivacyPage')}
              color="#10B981"
            />
            <SettingsItem
              icon={<LogOutIcon size={22} color="#EF4444" />}
              title="Déconnexion"
              subtitle="Fermer la session"
              onPress={handleLogout}
              isLast
              color="#EF4444"
            />
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = {
  sectionTitle: {
    color: '#94A3B8', fontSize: 12, marginBottom: 10, fontFamily: 'Text-Bold', fontWeight: '600', marginLeft: 5, letterSpacing: 1, marginTop: 25
  },
  sectionContainer: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 23, 42, 0.4)'
  }
};

export default memo(SettingsPage);