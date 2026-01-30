import { useEffect, useState } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity, ScrollView, Dimensions, StatusBar, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AccountHandler from "../../core/AccountHandler";
import HapticsHandler from "../../core/HapticsHandler";
import StorageHandler from "../../core/StorageHandler";
import APIEndpoints from "../../core/APIEndpoints";
import { parseHtmlData } from "../../util/Utils";
import { fetchED, useIOSFetch } from "../../util/functions";
import { useGlobalAppContext } from "../../util/GlobalAppContext";

// Double auth popup
function DoubleAuthPopup({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, setIsLoggedIn } = useGlobalAppContext();

  // Is loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

  // Whether the user chose the right answer
  const [wrongChoice, setWrongChoice] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(-1);

  // Question content
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [rawAnswers, setRawAnswers] = useState([]);

  // Parse the question
  async function getQuestion() {
    setIsLoading(true);
    setErrorLoading(false);

    try {
      var url = new URL(`${AccountHandler.USED_URL}${APIEndpoints.DOUBLE_AUTH}`);
      url.searchParams.set("verbe", "get");
      url.searchParams.set("v", "4.75.0");

      // Request
      const responseED = await fetchED(url.toString(), {
        method: "POST",
        body: 'data={}',
        headers: {
          "X-Token": AccountHandler.temporaryLoginToken,
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          "2fa-Token": AccountHandler.temporary2FAToken,
        }
      });

      // fetchED normalization means data is in .data
      var response = responseED ? {
        status: 200,
        data: responseED.data,
        headers: responseED.headers,
      } : { status: 500 };

      if (response.status === 200) {
        const code = response.data?.code || response.data?.status || 200;
        if (code === 200) {
          console.log("Got double auth content !");
          const headers = response.headers || {};
          // Update token if provided in headers
          const new2FaToken = headers["2fa-token"] || headers["2FA-TOKEN"] || headers["x-2fa-token"];
          if (new2FaToken) {
            AccountHandler.temporary2FAToken = new2FaToken;
          }

          setQuestion(parseHtmlData(response.data.data?.question ?? ""))
          var tempAnswers = [];
          response.data.data?.propositions?.forEach(answer => {
            tempAnswers.push(parseHtmlData(answer));
          });
          setAnswers(tempAnswers);
          setRawAnswers(response.data.data?.propositions ?? []);
        } else {
          console.warn(`API responded with unknown code ${code}`);
          setErrorLoading(true);
        }
      } else {
        console.warn("API request failed");
        setErrorLoading(true);
      }
    } catch (e) {
      console.warn("Error getting question:", e);
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

  async function confirmChoice() {
    if (selectedAnswer === -1) {
      HapticsHandler.vibrate("error");
      return;
    }

    HapticsHandler.vibrate("light");
    setIsConfirmingChoice(true);
    setErrorConfirmingChoice(false);

    console.log("Confirming choice...");

    try {
      var url = new URL(`${AccountHandler.USED_URL}${APIEndpoints.DOUBLE_AUTH}`);
      url.searchParams.set("verbe", "post");
      url.searchParams.set("v", "4.75.0");

      // Request
      const responseED = await fetchED(url.toString(), {
        method: "POST",
        body: `data=${JSON.stringify({
          "choix": rawAnswers[selectedAnswer],
        })}`,
        headers: {
          "X-Token": AccountHandler.temporaryLoginToken,
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          "2fa-token": AccountHandler.temporary2FAToken,
        }
      });

      var response = responseED ? {
        status: 200,
        data: responseED.data,
        headers: responseED.headers,
      } : { status: 500 };

      if (response.status === 200) {
        const code = response.data?.code || response.data?.status || 200;
        if (code === 200) {
          console.log("Right answer, got login IDs !");
          const { cn, cv } = response.data.data;
          const headers = response.headers || {};
          const new2FaToken = headers["2fa-token"] || headers["2FA-TOKEN"] || headers["x-2fa-token"];
          if (new2FaToken) AccountHandler.temporary2FAToken = new2FaToken;

          await StorageHandler.saveData("double-auth-tokens", { cn, cv });

          // Small delay to ensure storage consistency and avoid race conditions
          await new Promise(r => setTimeout(r, 500));

          const reloginStatus = await AccountHandler.refreshLogin();
          HapticsHandler.vibrate("light");

          if (reloginStatus == 1) {
            navigation.pop();
            setIsLoggedIn(true);
          } else if (reloginStatus == 2) {
            navigation.navigate("ChooseAccountPage");
          } else {
            console.warn("Relogin failed...");
            // If relogin fails (e.g. timeout), shows error but doesn't reset 'wrongChoice' 
            // because the choice was technically correct (we got cn/cv).
            setErrorConfirmingChoice("Login Failed");
          }
        } else {
          console.warn("Wrong answer, account suspended code:", code);
          setWrongChoice(true);
        }
      } else {
        console.warn("API request failed status:", response.status);
        setErrorConfirmingChoice(true);
      }
    } catch (e) {
      console.warn("Error confirming choice:", e);
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
        colors={['#0F111E', '#1A1B2E', '#151725']}
        style={styles.gradient}
      />

      <View style={{ flex: 1, paddingTop: Math.max(insets.top - 15, 10) }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#E5E7EB', fontSize: 24, fontWeight: '400' }}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VÉRIFICATION</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#A855F7" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : errorLoading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Une erreur est survenue.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={getQuestion}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : wrongChoice ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Mauvaise réponse.</Text>
              <Text style={styles.subErrorText}>Votre compte a peut-être été suspendu.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => { setWrongChoice(false); getQuestion(); }}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.instructionContainer}>
                <View style={styles.instructionBar} />
                <Text style={styles.instructionText}>
                  Sécurité renforcée : Veuillez répondre à la question secrète pour confirmer votre identité.
                </Text>
              </View>

              <Text style={styles.questionText}>
                {question}
              </Text>

              <ScrollView
                style={styles.optionsList}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                {answers.map((answer, index) => {
                  const isSelected = selectedAnswer === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedAnswer(index);
                        HapticsHandler.vibrate("light");
                      }}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected
                      ]}
                    >
                      <View style={styles.radioWrapper}>
                        <View style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected
                        ]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected
                      ]}>
                        {answer}
                      </Text>
                      {isSelected && <Text style={{ color: '#22D3EE', fontSize: 18 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>

        {/* Footer Button */}
        {!isLoading && !errorLoading && !wrongChoice && (
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.validateButton}
              activeOpacity={0.8}
              onPress={confirmChoice}
              disabled={isConfirmingChoice}
            >
              <LinearGradient
                colors={errorConfirmingChoice ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {isConfirmingChoice ? (
                  <ActivityIndicator color="#FFF" />
                ) : errorConfirmingChoice !== null && errorConfirmingChoice !== false ? (
                  <Text style={styles.validateButtonText}>Erreur ({errorConfirmingChoice})</Text>
                ) : (
                  <Text style={styles.validateButtonText}>Valider</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111E',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subErrorText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: '#FFF',
  },
  instructionContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    marginTop: 10,
  },
  instructionBar: {
    width: 4,
    backgroundColor: '#8B5CF6', // Purple Accent with Glow potential
    borderRadius: 2,
    marginRight: 15,
    height: '100%',
  },
  instructionText: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  optionsList: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 32, 50, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)', // Light purple tint
  },
  radioWrapper: {
    marginRight: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#22D3EE', // Cyan/Blue
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22D3EE',
  },
  optionText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  validateButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  gradientButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoubleAuthPopup;