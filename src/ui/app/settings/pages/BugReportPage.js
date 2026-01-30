import { memo, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon, BugIcon } from "lucide-react-native";
// import firestore from '@react-native-firebase/firestore';

import StorageHandler from "../../../../core/StorageHandler";
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

function BugReportPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  const [username, setUsername] = useState(null);
  const [selectedBugType, setSelectedBugType] = useState("functionality");
  const [bugDescription, setBugDescription] = useState("");
  const [sentBugReport, setSentBugReport] = useState(false);
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
    StorageHandler.getData("credentials").then(data => data && setUsername(data.username));
  }, []);

  async function sendBugReport() {
    if (isSendingBugReport || sentBugReport) return;
    setErrorWhileSendingBugReport(false);
    setIsSendingBugReport(true);

    try {
      const loginLogs = await StorageHandler.getData("logs-login");
      const marksLogs = await StorageHandler.getData("logs-marks");
      const homeworkLogs = await StorageHandler.getData("logs-homework");
      anonymiseLogs(loginLogs, marksLogs, homeworkLogs);

      // Use add() instead of set() to avoid overwriting reports
      // await firestore().collection("bugReports").add({
      //   username: username || 'unknown',
      //   date: new Date(),
      //   type: selectedBugType,
      //   description: bugDescription,
      //   logs: { login: loginLogs, marks: marksLogs, homework: homeworkLogs },
      // });
      console.log('BUG REPORT SIMULATION CHECK');

      StorageHandler.saveData("lastTimeSentBugReport", new Date());
      setSentBugReport(true);
    } catch (e) {
      setErrorWhileSendingBugReport(true);
      console.warn("Bug Report Failed:", e);
      Alert.alert("Erreur", "Impossible d'envoyer le rapport. Vérifiez votre connexion ou la configuration Firebase.");
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
      <Text style={{ color: selectedBugType === typeId ? '#FFF' : (theme.dark ? '#94A3B8' : '#64748B'), fontWeight: 'bold' }}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={(e) => setWindowWidth(e.nativeEvent.layout.width)}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Signaler un bug" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Icon Replacement for Lottie */}
          <View style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 20 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red Tint
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: '#EF4444',
              shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 0.3, elevation: 10
            }}>
              <BugIcon size={50} color="#EF4444" />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* Type Selector */}
            <Text style={[styles.label, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>TYPE DE PROBLÈME</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.values(bugTypes).map(t => <TypeButton key={t.id} typeId={t.id} title={t.title} />)}
            </View>

            {/* Description */}
            <Text style={[styles.label, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>DÉTAILS</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <TextInput
                style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 16, textAlignVertical: 'top', height: 120 }}
                multiline
                placeholder="Décrivez le problème..."
                placeholderTextColor="#64748B"
                value={bugDescription}
                onChangeText={setBugDescription}
                maxLength={250}
              />
              <Text style={{ textAlign: 'right', color: '#64748B', fontSize: 12, marginTop: 5 }}>{bugDescription.length}/250</Text>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={sendBugReport}
              disabled={isSendingBugReport || sentBugReport}
              style={{
                marginTop: 30,
                backgroundColor: sentBugReport ? '#10B981' : errorWhileSendingBugReport ? '#EF4444' : theme.colors.primary,
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: sentBugReport ? '#10B981' : theme.colors.primary,
                shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { height: 4, width: 0 }
              }}
            >
              {isSendingBugReport ? <ActivityIndicator color={theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF'} /> : (
                <Text style={{ color: (sentBugReport || errorWhileSendingBugReport) ? '#FFF' : (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF'), fontSize: 16, fontWeight: 'bold' }}>
                  {sentBugReport ? "Merci de votre aide !" : errorWhileSendingBugReport ? "Erreur" : "Envoyer le signalement"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Info */}
            <View style={{ marginTop: 30, opacity: 0.7 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'justify', marginBottom: 10 }}>
                En envoyant ce signalement, vous acceptez de partager des logs anonymisés (sans info personnelle) pour nous aider à corriger le problème.
              </Text>
            </View>
          </View>
        </ScrollView>
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