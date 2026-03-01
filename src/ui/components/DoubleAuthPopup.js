import { useEffect, useState } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity, ScrollView, Dimensions, StatusBar, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react-native';

import AccountHandler from "../../core/AccountHandler";
import HapticsHandler from "../../core/HapticsHandler";
import StorageHandler from "../../core/StorageHandler";
import { parseHtmlData } from "../../util/Utils";
import { useGlobalAppContext } from "../../util/GlobalAppContext";

const { width } = Dimensions.get('window');

// Double auth popup
function DoubleAuthPopup({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, setIsLoggedIn } = useGlobalAppContext();

  // Is loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

  // Question and answers
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);
  const [rawAnswers, setRawAnswers] = useState([]);

  // Parse the question
  async function getQuestion() {
    setIsLoading(true);
    setErrorLoading(false);

    try {
      console.log("[2FA-DEBUG] Fetching question via AccountHandler...");

      const questionData = await AccountHandler.get2FAQuestion();

      if (questionData && questionData.question) {
        console.log("[2FA-DEBUG] Got double auth content!");

        const questionText = parseHtmlData(questionData.question);
        setQuestion(questionText);

        const tempAnswers = (questionData.propositions || []).map(answer => parseHtmlData(answer));
        setAnswers(tempAnswers);
        setRawAnswers(questionData.propositions || []);
      } else {
        console.warn("[2FA-DEBUG] No question data returned from library");
        setErrorLoading(true);
      }
    } catch (e) {
      console.warn("[2FA-DEBUG] Error getting question:", e);
      setErrorLoading(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!question && !isLoading) { getQuestion(); }
  }, []);

  // Confirm choice
  const [isConfirmingChoice, setIsConfirmingChoice] = useState(false);
  const [errorConfirmingChoice, setErrorConfirmingChoice] = useState(false);
  const [wrongChoice, setWrongChoice] = useState(false);

  async function confirmChoice() {
    if (selectedAnswer === -1) {
      HapticsHandler.vibrate("error");
      return;
    }

    HapticsHandler.vibrate("light");
    setIsConfirmingChoice(true);
    setErrorConfirmingChoice(false);
    setWrongChoice(false);

    try {
      const selectedResponse = rawAnswers[selectedAnswer];
      const result = await AccountHandler.send2FAResponse(selectedResponse);

      if (result && result.cn && result.cv) {
        const { cn, cv } = result;
        await StorageHandler.saveData("double-auth-tokens", { cn, cv });

        // Wait for storage consistency
        await new Promise(r => setTimeout(r, 1500));

        const reloginStatus = await AccountHandler.refreshLogin();
        HapticsHandler.vibrate("light");

        if (reloginStatus == 1) {
          // Do NOT call navigation.pop() here — setIsLoggedIn(true) will unmount AuthStack
          // entirely (including this popup), so calling pop() first creates two simultaneous
          // navigation state mutations that corrupt React Navigation's StackRouter state.
          setIsLoggedIn(true);
        } else if (reloginStatus == 2) {
          navigation.navigate("ChooseAccountPage");
        } else {
          setErrorConfirmingChoice("Login Failed");
        }
      } else {
        setWrongChoice(true);
        HapticsHandler.vibrate("error");
      }
    } catch (e) {
      console.warn("[2FA-DEBUG] Error confirming choice:", e);
      setErrorConfirmingChoice(true);
    } finally {
      setIsConfirmingChoice(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#2E1065', '#0F172A']}
        style={styles.gradient}
      />

      {/* Animated Accent Orb */}
      <View style={styles.accentOrb} />

      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 10) }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VÉRIFICATION</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A855F7" />
              <Text style={styles.loadingText}>Vérification sécurisée...</Text>
            </View>
          ) : errorLoading ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#EF4444" />
              <Text style={styles.errorText}>Impossible de récupérer la question</Text>
              <TouchableOpacity style={styles.retryButton} onPress={getQuestion}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.questionSection}>
              {/* Security Icon Badge */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#A855F7', '#3B82F6']}
                  style={styles.iconGlow}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <View style={styles.iconInner}>
                  <ShieldCheck size={32} color="#FFF" />
                </View>
              </View>

              <Text style={styles.questionSubtitle}>QUESTION DE SÉCURITÉ</Text>
              <Text style={styles.questionTitle}>{question}</Text>

              <View style={styles.divider} />

              <View style={styles.answersList}>
                {answers.map((answer, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedAnswer(index);
                      setWrongChoice(false);
                      HapticsHandler.vibrate("selection");
                    }}
                    style={[
                      styles.answerItem,
                      selectedAnswer === index && styles.answerItemSelected,
                      wrongChoice && selectedAnswer === index && styles.answerItemWrong
                    ]}
                  >
                    <View style={[
                      styles.radio,
                      selectedAnswer === index && styles.radioSelected
                    ]}>
                      {selectedAnswer === index && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.answerText,
                      selectedAnswer === index && styles.answerTextSelected
                    ]}>{answer}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {wrongChoice && (
                <View style={styles.errorLabelContainer}>
                  <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.wrongLabel}>Mauvaise réponse, réessayez.</Text>
                </View>
              )}

              {errorConfirmingChoice && (
                <Text style={styles.errorLabel}>
                  {typeof errorConfirmingChoice === 'string' ? errorConfirmingChoice : "Une erreur est survenue lors de la validation."}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            onPress={confirmChoice}
            disabled={selectedAnswer === -1 || isLoading || isConfirmingChoice}
            activeOpacity={0.8}
            style={[
              styles.confirmButton,
              (selectedAnswer === -1 || isLoading || isConfirmingChoice) && styles.confirmButtonDisabled
            ]}
          >
            <LinearGradient
              colors={['#A855F7', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              borderRadius={20}
              opacity={selectedAnswer === -1 ? 0.4 : 1}
            />
            {isConfirmingChoice ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>CONTINUER</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  gradient: { ...StyleSheet.absoluteFillObject },
  accentOrb: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#A855F7',
    opacity: 0.1,
  },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  headerTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'Text-Bold',
    letterSpacing: 3
  },
  loadingContainer: { height: 400, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 20, fontSize: 15, fontFamily: 'Text-Medium' },
  errorContainer: { height: 400, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, fontFamily: 'Text-Bold', marginTop: 20, marginBottom: 30, textAlign: 'center' },
  retryButton: { paddingHorizontal: 30, paddingVertical: 14, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' },
  retryButtonText: { color: '#EF4444', fontSize: 14, fontFamily: 'Text-Bold' },

  questionSection: { alignItems: 'center', marginTop: 10 },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    opacity: 0.2,
    transform: [{ rotate: '45deg' }],
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'Text-Bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  questionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Text-Bold',
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 25,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 35,
  },
  answersList: { width: '100%', gap: 14 },
  answerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  answerItemSelected: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.05)'
  },
  answerItemWrong: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radioSelected: { borderColor: '#A855F7' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A855F7' },
  answerText: { flex: 1, color: '#94A3B8', fontSize: 16, fontFamily: 'Text-Medium' },
  answerTextSelected: { color: '#FFFFFF', fontFamily: 'Text-Bold' },

  errorLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  wrongLabel: { color: '#EF4444', fontSize: 13, fontFamily: 'Text-Medium' },
  errorLabel: { color: '#EF4444', marginTop: 15, textAlign: 'center', fontSize: 13, fontFamily: 'Text-Medium' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: 'transparent'
  },
  confirmButton: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Text-Bold', letterSpacing: 1.5 },
});

export default DoubleAuthPopup;