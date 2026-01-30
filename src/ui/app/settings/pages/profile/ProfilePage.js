import { memo, useState, useEffect } from "react";
import { View, Text, Dimensions, ScrollView, Platform, TouchableOpacity } from "react-native";
import { ArrowLeftIcon, SchoolIcon, GraduationCapIcon, ChevronLeftIcon, ArrowRightLeftIcon, LogOutIcon, UserIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DisconnectModal from "./DisconnectModal";
import SwitchAccountModal from "./SwitchAccountModal";
import CustomProfilePhoto from "../../../../components/CustomProfilePhoto";
import AccountHandler from "../../../../../core/AccountHandler";
import HapticsHandler from "../../../../../core/HapticsHandler";
import { useGlobalAppContext } from "../../../../../util/GlobalAppContext";
import { useCurrentAccountContext } from "../../../../../util/CurrentAccountContext";
import StorageHandler from "../../../../../core/StorageHandler";

// Helper Header
const GalaxyHeader = ({ title, onBack, theme }) => {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? insets.top + 25 : insets.top;
  return (
    <View style={{ paddingTop: topPadding, paddingHorizontal: 20, paddingBottom: 20, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            position: 'absolute', left: 20,
            backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
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

function ProfilePage({ navigation }) {
  const { theme, setIsLoggedIn, setIsAutoTheme } = useGlobalAppContext();
  const { mainAccount } = useCurrentAccountContext();
  const insets = useSafeAreaInsets();
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  // Logic
  const [canSwitchAccounts, setCanSwitchAccounts] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    StorageHandler.getData("accounts").then(accounts => {
      if (Object.keys(accounts ?? {}).length > 1) { setCanSwitchAccounts(true); }
    });
  }, []);

  async function switchAccount(newAccountID) {
    if (newAccountID != mainAccount.id) {
      await StorageHandler.saveData("selectedAccount", `${newAccountID}`);
      await AccountHandler.refreshToken(mainAccount.id, newAccountID);
      navigation.navigate("MainStack", { newAccountID: newAccountID });
      HapticsHandler.vibrate("light");
    }
    setIsSwitchingAccount(false);
  }

  async function disconnect() {
    setIsAutoTheme(true);
    await AccountHandler.eraseData();
    setIsDisconnecting(false);
    setIsLoggedIn(false);
    HapticsHandler.vibrate("light");
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={(e) => setWindowWidth(e.nativeEvent.layout.width)}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Profil" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Cover Section */}
          <View style={{ alignItems: 'center', paddingTop: 100, paddingBottom: 40 }}>
            <View style={{ padding: 4, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 60 }}>
              <CustomProfilePhoto accountID={mainAccount.id} size={110} />
            </View>
            <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 24, fontFamily: 'Text-Bold', marginTop: 15 }}>
              {mainAccount?.firstName} {mainAccount?.lastName}
            </Text>
            <Text style={{ color: '#A78BFA', fontSize: 16, fontFamily: 'Text-Medium' }}>
              {mainAccount?.accountType == "E" ? mainAccount?.grade : "Compte Parent"}
            </Text>

            <View style={{
              marginTop: 10, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10
            }}>
              <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 12 }}>ID: {mainAccount?.id}</Text>
            </View>
          </View>

          {/* Info Cards */}
          <View style={{ paddingHorizontal: 20 }}>

            {/* School & Grade */}
            <View style={{
              backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, padding: 20,
              borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginBottom: 20,
              shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
            }}>
              {mainAccount?.accountType == "E" && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                    <GraduationCapIcon size={20} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 12 }}>CLASSE</Text>
                    <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontWeight: '600' }}>{mainAccount?.grade}</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                  <SchoolIcon size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 12 }}>ÉTABLISSEMENT</Text>
                  <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                    {mainAccount?.school || "Non renseigné"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Children (Parent Account) */}
            {mainAccount?.accountType == "P" && Object.keys(mainAccount?.children || {}).length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10, fontFamily: 'Text-Bold', letterSpacing: 1, marginLeft: 5 }}>ENFANTS</Text>
                {Object.keys(mainAccount.children).map(childID => {
                  const child = mainAccount.children[childID];
                  return (
                    <View key={childID} style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 10,
                      borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
                    }}>
                      <CustomProfilePhoto accountID={childID} size={50} style={{ marginRight: 15 }} />
                      <View>
                        <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, fontWeight: '600' }}>{child.firstName} {child.lastName}</Text>
                        <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 13 }}>{child.grade}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Actions */}
            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10, fontFamily: 'Text-Bold', letterSpacing: 1, marginLeft: 5 }}>COMPTE</Text>
            <View style={{
              backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, overflow: 'hidden',
              borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
            }}>
              {canSwitchAccounts && (
                <TouchableOpacity
                  onPress={() => setIsSwitchingAccount(true)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 15,
                    borderBottomWidth: 1, borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                  }}
                >
                  <ArrowRightLeftIcon size={20} color="#F59E0B" style={{ marginRight: 15 }} />
                  <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, flex: 1, fontSize: 16 }}>Changer de compte</Text>
                  <Text style={{ color: '#F59E0B', fontSize: 12 }}>Changer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setIsDisconnecting(true)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}
              >
                <LogOutIcon size={20} color="#EF4444" style={{ marginRight: 15 }} />
                <Text style={{ color: '#EF4444', flex: 1, fontSize: 16 }}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>

        <SwitchAccountModal
          isSwitchingAccount={isSwitchingAccount}
          setIsSwitchingAccount={setIsSwitchingAccount}
          switchAccount={switchAccount}
          selectedAccount={mainAccount?.id}
        />
        <DisconnectModal
          isDisconnecting={isDisconnecting}
          setIsDisconnecting={setIsDisconnecting}
          disconnect={disconnect}
        />
      </LinearGradient>
    </View>
  );
}

export default memo(ProfilePage);