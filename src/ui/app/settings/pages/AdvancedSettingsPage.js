import { memo, useState, useEffect } from "react";
import { View, Text, Switch, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeftIcon,
  LandPlotIcon,
  TrashIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  LockIcon,
  SmartphoneIcon
} from "lucide-react-native";

import AccountHandler from "../../../../core/AccountHandler";
import MarksHandler from "../../../../core/MarksHandler";
import HapticsHandler from "../../../../core/HapticsHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import StorageHandler from "../../../../core/StorageHandler";

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
const AdvancedItem = ({ title, subtitle, icon, rightElement, onPress, color, isDestructive, theme }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
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
      <Text style={{ color: isDestructive ? '#EF4444' : (theme.dark ? '#FFF' : theme.colors.onBackground), fontSize: 16, fontFamily: 'Text-Bold', fontWeight: '600' }}>{title}</Text>
      {subtitle && <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'Text-Medium', marginTop: 2 }}>{subtitle}</Text>}
    </View>
    {rightElement}
  </TouchableOpacity>
);

function AdvancedSettingsPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { mainAccount } = useCurrentAccountContext();
  const [updateTrigger, setUpdateTrigger] = useState(false);

  // Data
  const [countCompetences, setCountCompetences] = useState(false);
  const [enableVibrations, setEnableVibrations] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    AccountHandler.getPreference("countMarksWithOnlyCompetences").then(setCountCompetences);
    AccountHandler.getPreference("enableVibrations").then(setEnableVibrations);
  }, [updateTrigger, globalDisplayUpdater]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Avancé" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>

          {/* CALCUL DES MOYENNES */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>CALCUL DES MOYENNES</Text>
          <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <AdvancedItem
              theme={theme}
              title="Compter les compétences"
              subtitle="Inclure les notes non-numériques (compétences) dans la moyenne."
              icon={<LandPlotIcon size={20} color="#10B981" />}
              color="#10B981"
              rightElement={
                <Switch
                  value={countCompetences}
                  trackColor={{ false: "#334155", true: theme.colors.primary }}
                  thumbColor={"#FFF"}
                  onValueChange={async (value) => {
                    setCountCompetences(value);
                    await AccountHandler.setPreference("countMarksWithOnlyCompetences", value);
                    if (mainAccount.accountType == "E") { await MarksHandler.recalculateAverageHistory(mainAccount.id); }
                    else {
                      for (const childID in mainAccount.children) {
                        await MarksHandler.recalculateAverageHistory(childID);
                      }
                    }
                    updateGlobalDisplay();
                  }}
                />
              }
            />
          </View>

          {/* PRÉFÉRENCES */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>PRÉFÉRENCES</Text>
          <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <AdvancedItem
              theme={theme}
              title="Vibrations"
              subtitle="Activer le retour haptique."
              icon={<SmartphoneIcon size={20} color="#F59E0B" />}
              color="#F59E0B"
              rightElement={
                <Switch
                  value={enableVibrations}
                  trackColor={{ false: "#334155", true: theme.colors.primary }}
                  thumbColor={"#FFF"}
                  onValueChange={async (value) => {
                    setEnableVibrations(value);
                    await HapticsHandler.toggle(value);
                    updateGlobalDisplay();
                  }}
                />
              }
            />
          </View>


          {/* ZONES DE DANGER */}
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>ZONES DE DANGER</Text>
          <View style={[styles.cardContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)' }]}>
            <AdvancedItem
              theme={theme}
              title="Reset coefficients"
              subtitle="Effacer les coefficients personnalisés."
              icon={<RotateCcwIcon size={20} color="#EF4444" />}
              color="#EF4444"
              isDestructive
              onPress={() => MarksHandler.resetCoefficients(mainAccount, updateGlobalDisplay)}
              rightElement={<ArrowRightIcon size={20} color="#EF4444" />}
            />
            <AdvancedItem
              theme={theme}
              title="Effacer le cache"
              subtitle="Supprimer les fichiers temporaires."
              icon={<TrashIcon size={20} color="#EF4444" />}
              color="#EF4444"
              isDestructive
              onPress={() => AccountHandler.eraseCacheData()}
              rightElement={<ArrowRightIcon size={20} color="#EF4444" />}
            />
            <AdvancedItem
              theme={theme}
              title="Ré-authentifier"
              subtitle="Forcer une reconnexion (Double Auth)."
              icon={<LockIcon size={20} color="#EF4444" />}
              color="#EF4444"
              isDestructive
              onPress={async () => {
                setIsReconnecting(true);
                await StorageHandler.deleteFiles(["double-auth-tokens"]);
                await AccountHandler.refreshLogin();
                setIsReconnecting(false);
                Alert.alert("Terminé", "Authentification rafraîchie.");
              }}
              rightElement={isReconnecting ? <ActivityIndicator color="#EF4444" /> : <ArrowRightIcon size={20} color="#EF4444" />}
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
};

export default memo(AdvancedSettingsPage);