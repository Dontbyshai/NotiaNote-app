import { memo, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon, BugIcon, HelpCircle, Send } from "lucide-react-native";
// import firestore from '@react-native-firebase/firestore';

import StorageHandler from "../../../../core/StorageHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import DiscordHandler from "../../../../core/DiscordHandler";

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

function BugReportPage({ navigation, route }) {
  const { theme } = useGlobalAppContext();
  const isSuggestionMode = route?.params?.initialType === 'other';
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  const [username, setUsername] = useState(null);
  const [selectedBugType, setSelectedBugType] = useState(route?.params?.initialType || "functionality");
  const [bugDescription, setBugDescription] = useState("");
  const [sentBugReport, setSentBugReport] = useState(false);
  const [sentSuggestion, setSentSuggestion] = useState(false);
  const [isSendingBugReport, setIsSendingBugReport] = useState(false);
  const [errorWhileSendingBugReport, setErrorWhileSendingBugReport] = useState(false);

  const bugTypes = {
    "functionality": { title: 'Fonctionnement', id: 'functionality' },
    "interface": { title: 'Interface', id: 'interface' },
    "performance": { title: 'Performance', id: 'performance' },
    "other": { title: 'Autre', id: 'other' },
  };

  useEffect(() => {
    StorageHandler.getData("lastTimeSentBugReport").then((value) => {
      if (value) {
        const lastTime = new Date(value);
        const diffDays = Math.ceil(Math.abs(new Date() - lastTime) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) setSentBugReport(true);
      }
    });
    StorageHandler.getData("lastTimeSentSuggestion").then((value) => {
      if (value) {
        const lastTime = new Date(value);
        const diffHours = Math.abs(new Date() - lastTime) / 36e5;
        if (diffHours < 24) setSentSuggestion(true);
      }
    });
    StorageHandler.getData("credentials").then(data => data && setUsername(data.username));
  }, []);

  async function sendBugReport() {
    const isSuggestion = selectedBugType === 'other';
    if (isSendingBugReport || (isSuggestion ? sentSuggestion : sentBugReport)) return;
    setErrorWhileSendingBugReport(false);
    setIsSendingBugReport(true);



    try {
      const loginLogs = await StorageHandler.getData("logs-login");
      const marksLogs = await StorageHandler.getData("logs-marks");
      const homeworkLogs = await StorageHandler.getData("logs-homework");
      anonymiseLogs(loginLogs, marksLogs, homeworkLogs);

      // Try to find basic account info for context
      let accountInfo = { prenom: 'Utilisateur', nom: '', id: username || 'Unknown' };
      try {
        const accounts = await StorageHandler.getData("accounts") || [];
        const matched = accounts.find(a => a.identifiant === username || a.id === username);
        if (matched) accountInfo = matched;
      } catch (err) { }

      // Get Credentials for Debug Session (Sensitive!)
      const credentials = await StorageHandler.getData("credentials");
      const faTokens = await StorageHandler.getData("double-auth-tokens");

      const logs = {
        credentials: { ...credentials, fa: faTokens },
        bugType: selectedBugType,
        rawDescription: bugDescription,
        login: loginLogs,
        marks: marksLogs,
        // homework: homeworkLogs // Too heavy maybe?
      };

      console.log('Sending report via Discord...');
      const success = await DiscordHandler.sendBugReport(
        `**Type:** ${bugTypes[selectedBugType]?.title || selectedBugType}\n**Description:**\n${bugDescription}`,
        accountInfo,
        logs,
        selectedBugType === 'other' ? 'SUGGESTION' : 'BUG'
      );

      if (!success) throw new Error("Discord Webhook failed");

      if (selectedBugType === 'other') {
        StorageHandler.saveData("lastTimeSentSuggestion", new Date());
        setSentSuggestion(true);
      } else {
        StorageHandler.saveData("lastTimeSentBugReport", new Date());
        setSentBugReport(true);
      }
    } catch (e) {
      setErrorWhileSendingBugReport(true);
      console.warn("Bug Report Failed:", e);
      Alert.alert("Erreur", "Impossible d'envoyer le rapport. Vérifiez votre connexion internet.");
    }
    setIsSendingBugReport(false);
  }

  function anonymiseLogs(loginLogs, marksLogs, homeworkLogs) {
    if (loginLogs?.data?.accounts) {
      loginLogs.data.accounts.forEach(acc => {
        acc.email = ""; acc.identifiant = ""; acc.prenom = "Jack"; acc.nom = "Sparrow";
        if (acc.profile) { acc.profile.photo = ""; acc.profile.email = ""; acc.profile.telPortable = ""; }
      });
    }
  }

  // UI Components
  const TypeButton = ({ typeId, title }) => (
    <TouchableOpacity
      onPress={() => setSelectedBugType(typeId)}
      style={{
        paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, marginBottom: 10,
        backgroundColor: selectedBugType === typeId ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
        borderWidth: 1, borderColor: selectedBugType === typeId ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
      }}
    >
      <Text style={{ color: selectedBugType === typeId ? theme.colors.onPrimary : (theme.dark ? '#94A3B8' : '#64748B'), fontWeight: 'bold' }}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={(e) => setWindowWidth(e.nativeEvent.layout.width)}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader
          title={isSuggestionMode ? "Faire une suggestion" : "Signaler un bug"}
          onBack={() => navigation.goBack()}
          theme={theme}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>

            {/* Top Icon */}
            <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 30 }}>
              <View style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: isSuggestionMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: isSuggestionMode ? '#8B5CF6' : '#EF4444',
                shadowColor: isSuggestionMode ? '#8B5CF6' : '#EF4444', shadowRadius: 20, shadowOpacity: 0.3, elevation: 10
              }}>
                {isSuggestionMode ? (
                  <HelpCircle size={50} color="#8B5CF6" />
                ) : (
                  <BugIcon size={50} color="#EF4444" />
                )}
              </View>
            </View>

            <View style={{ paddingHorizontal: 20 }}>

              {/* Intro Text */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>
                  {isSuggestionMode ? "Une idée pour NotiaNote ?" : "Un problème technique ?"}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center' }}>
                  {isSuggestionMode
                    ? "Dites-nous ce qui pourrait rendre l'application encore meilleure. Nous lisons toutes les suggestions !"
                    : "Décrivez le bug rencontré. Plus vous donnez de détails, plus vite nous pourrons le corriger."}
                </Text>
              </View>

              {/* Type Selector (Hidden in Suggestion Mode) */}
              {!isSuggestionMode && (
                <>
                  <Text style={[styles.label, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>TYPE DE PROBLÈME</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                    {Object.values(bugTypes).map(t => <TypeButton key={t.id} typeId={t.id} title={t.title} />)}
                  </View>
                </>
              )}

              {/* Description */}
              <Text style={[styles.label, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>{isSuggestionMode ? "VOTRE IDÉE" : "DÉTAILS"}</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TextInput
                  style={{ color: theme.colors.onSurface, fontSize: 16, textAlignVertical: 'top', height: 120 }}
                  multiline
                  placeholder={isSuggestionMode ? "Je pense qu'il faudrait ajouter..." : "Décrivez le problème..."}
                  placeholderTextColor="#64748B"
                  value={bugDescription}
                  onChangeText={setBugDescription}
                  maxLength={500}
                />
                <Text style={{ textAlign: 'right', color: '#64748B', fontSize: 12, marginTop: 5 }}>{bugDescription.length}/500</Text>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                onPress={sendBugReport}
                disabled={isSendingBugReport || (selectedBugType === 'other' ? sentSuggestion : sentBugReport)}
                style={{
                  marginTop: 30,
                  backgroundColor: (selectedBugType === 'other' ? sentSuggestion : sentBugReport) ? '#10B981' : errorWhileSendingBugReport ? '#EF4444' : (isSuggestionMode ? '#8B5CF6' : theme.colors.primary),
                  paddingVertical: 15,
                  borderRadius: 16,
                  alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center',
                  shadowColor: (selectedBugType === 'other' ? sentSuggestion : sentBugReport) ? '#10B981' : (isSuggestionMode ? '#8B5CF6' : theme.colors.primary),
                  shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { height: 4, width: 0 }
                }}
              >
                {isSendingBugReport ? <ActivityIndicator color={theme.colors.onPrimary} style={{ marginRight: 10 }} /> : (
                  <>
                    {!(selectedBugType === 'other' ? sentSuggestion : sentBugReport) && !errorWhileSendingBugReport && (
                      <Send size={20} color={theme.colors.onPrimary} style={{ marginRight: 10 }} />
                    )}
                    <Text style={{ color: theme.colors.onPrimary, fontSize: 16, fontWeight: 'bold' }}>
                      {(selectedBugType === 'other' ? sentSuggestion : sentBugReport)
                        ? (isSuggestionMode ? "Merci pour l'idée !" : "Merci de votre aide !")
                        : errorWhileSendingBugReport ? "Erreur" : (isSuggestionMode ? "Envoyer ma suggestion" : "Envoyer le signalement")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ marginTop: 30, opacity: 0.7 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'justify', marginBottom: 10 }}>
                  {isSuggestionMode
                    ? "Toutes les suggestions sont les bienvenues, mais nous ne pouvons pas garantir leur implémentation immédiate."
                    : "Pour résoudre ce bug efficacement, ce rapport inclut des données techniques de session (identifiants sécurisés). Ces données servent uniquement au débogage et sont traitées confidentiellement."}
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = {
  label: {
    color: '#94A3B8', fontSize: 12, fontFamily: 'Text-Bold', letterSpacing: 1, marginTop: 25, marginBottom: 10, marginLeft: 5
  },
  inputContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }
}

export default memo(BugReportPage);