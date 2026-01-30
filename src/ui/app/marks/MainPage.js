import { useEffect } from "react";
import { View, Text, Dimensions, ScrollView, RefreshControl, Platform, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCwIcon } from 'lucide-react-native';
import useState from "react-usestateref";

import EmbeddedMarksPage from "./EmbeddedMarksPage";
import WelcomeMessage from "./WelcomeMessage";
import CustomChooser from "../../components/CustomChooser";
import CustomProfilePhoto from "../../components/CustomProfilePhoto";
import HapticsHandler from "../../../core/HapticsHandler";
import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import AccountHandler from "../../../core/AccountHandler";
import StorageHandler from "../../../core/StorageHandler";
import MarksHandler from "../../../core/MarksHandler";


// Main page
function MainPage({ route, navigation }) {
  const { theme } = useGlobalAppContext();
  const { mainAccount, updateMainAccount, manualRefreshing, setManualRefreshing } = useCurrentAccountContext();

  // Connected main account (parent / student)
  const newAccountID = route.params?.newAccountID;
  useEffect(() => {
    if (newAccountID) {
      updateMainAccount(newAccountID);
    }
  }, [newAccountID])

  // Switch account
  const [isSwitchingAccounts, setIsSwitchingAccounts] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  useEffect(() => {
    StorageHandler.getData("accounts").then(accounts => {
      if (!accounts) { return; }
      if (Object.keys(accounts).length > 1) {
        delete accounts[mainAccount.id];
        setAvailableAccounts(Object.values(accounts));
      }
    });
  }, [mainAccount.id]);
  async function switchAccount(newAccountID) {
    setIsSwitchingAccounts(true);
    await StorageHandler.saveData("selectedAccount", `${newAccountID}`);
    await AccountHandler.refreshToken(mainAccount.id, newAccountID);
    navigation.navigate("HomeTabs", { screen: "MarksTab", params: { newAccountID: newAccountID } });
    console.log(`Switched to account ${newAccountID} !`);
    HapticsHandler.vibrate("light");
    setIsSwitchingAccounts(false);
  }

  // Refresh logic
  useEffect(() => {
    if (manualRefreshing) {
      MarksHandler.getMarks(mainAccount.id).then(() => {
        setManualRefreshing(false);
        HapticsHandler.vibrate("light");
      });
    }
  }, [manualRefreshing]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <ScrollView
          bounces={true}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          style={{
            height: '100%',
            // backgroundColor: theme.colors.background, // Removed for gradient
            paddingTop: Platform.select({ ios: 0, android: 50 }),
          }}
          refreshControl={
            <RefreshControl refreshing={manualRefreshing} onRefresh={() => {
              setManualRefreshing(true);
            }} tintColor={theme.colors.onBackground} />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <SafeAreaView edges={{ top: "off" }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              marginHorizontal: 20,
              marginTop: 10,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 34, fontFamily: 'Text-Bold', color: theme.colors.onBackground }}>Notes</Text>
                <TouchableOpacity onPress={() => {
                  setManualRefreshing(true);
                }}>
                  <RotateCwIcon size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>

              <CustomChooser
                title={"Basculer de compte"}
                items={availableAccounts.map(account => {
                  return {
                    id: account.id,
                    title: `${account.firstName} ${account.lastName}`,
                  }
                })}
                defaultItem={!isSwitchingAccounts ? (
                  <CustomProfilePhoto
                    accountID={mainAccount.id}
                    size={45}
                    onPress={() => navigation.navigate("SettingsStack")}
                    hasOtherPressAction={availableAccounts.length >= 1}
                  />
                ) : (
                  <ActivityIndicator size={45} />
                )}
                selected={mainAccount.id}
                setSelected={switchAccount}
                longPress
              />
            </View>

            {/* Marks overview */}
            <EmbeddedMarksPage navigation={navigation} />
          </SafeAreaView>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

export default MainPage;