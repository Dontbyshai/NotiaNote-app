import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { Text, View, ActivityIndicator, Alert } from "react-native";
import { CornerDownRightIcon, InfoIcon, Wand2Icon, UserRoundIcon, ChevronsUpDownIcon, AlertTriangleIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";

import ChildChooser from "./ChildChooser";
import AddMarkModal from "./AddMarkModal";
import HomeworkStatus from "../homework/HomeworkStatus";
import MarksOverview from "./marks-overview/MarksOverview";
import SubjectsOverview from "./subjects-overview/SubjectsOverview";
import CustomSection from "../../components/CustomSection";
import CustomChooser from "../../components/CustomChooser";
import CustomSimpleInformationCard from "../../components/CustomSimpleInformationCard";
import BannerAdComponent from "../../components/Ads/BannerAdComponent";
import MarksHandler from "../../../core/MarksHandler";
import AdsHandler from "../../../core/AdsHandler";
import CoefficientHandler from "../../../core/CoefficientHandler";
import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import StorageHandler from "../../../core/StorageHandler";


// Embedded mark page
function EmbeddedMarksPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { accountID, mainAccount } = useCurrentAccountContext();
  const isFocused = useIsFocused();

  // Selected period
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [latestCurrentPeriod, setLatestCurrentPeriod] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Simulation
  const [addMarkModalVisible, setAddMarkModalVisible] = useState(false);
  const [selectedSubjectForSim, setSelectedSubjectForSim] = useState(null);

  // Appreciations Mode
  const [showAppreciations, setShowAppreciations] = useState(false);

  // Show warning telling the user the guess parameters have been set automatically
  const [showGuessParametersWarning, setShowGuessParametersWarning] = useState({});
  useEffect(() => {
    MarksHandler.showGuessParametersWarning = (accountID) => setShowGuessParametersWarning({ ...showGuessParametersWarning, [accountID]: true });
  }, []);

  // Get periods of student (and update at every change)
  const [periods, setPeriods] = useState({});
  useEffect(() => {
    const fetchData = async () => {
      const data = await StorageHandler.getData("marks");
      var cacheData = data ?? {};
      if (accountID in cacheData) {
        setPeriods(cacheData[accountID].data);
      } else {
        setPeriods({});
        // If nothing in cache, force a refresh
        refreshMarks();
      }
    };
    fetchData();
  }, [accountID, globalDisplayUpdater]);

  // Refresh data when screen is focused
  useEffect(() => {
    if (isFocused) {
      refreshMarks();
    }
  }, [isFocused, accountID]);

  async function refreshMarks() {
    // Only show loading if we have NO data yet to avoid flickering
    // Check local state first (smoothest), then cache
    const hasDataOnScreen = periods && Object.keys(periods).length > 0;

    if (!hasDataOnScreen) {
      const currentData = await StorageHandler.getData("marks");
      const hasCacheData = currentData && currentData[accountID];
      if (!hasCacheData) setLoading(true);
    }

    try {
      await MarksHandler.getMarks(accountID);
    } catch (e) {
      console.warn("[MarksPage] Failed to refresh marks:", e);
    } finally {
      setLoading(false);
      updateGlobalDisplay();
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[theme.fonts.bodyMedium, { color: theme.colors.onSurfaceDisabled, marginTop: 10 }]}>Chargement des notes...</Text>
      </View>
    );
  }

  return (
    <View>
      {mainAccount.accountType == "P" && <ChildChooser />}

      {/* Warning showing when guess parameters have been automatically set */}
      {showGuessParametersWarning[accountID] && (
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <PressableScale style={{
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.surfaceOutline,
            paddingHorizontal: 15,
            paddingVertical: 10,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }} onPress={() => navigation.navigate('SettingsStack', { screen: 'CoefficientsPage' })}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Wand2Icon size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <Text style={theme.fonts.bodyLarge}>Paramètres ajustés !</Text>
            </View>
            <InfoIcon size={20} color={theme.colors.onSurfaceDisabled} />

            {/* Alert badge */}
            <AlertTriangleIcon size={30} color={theme.colors.error} style={{
              position: 'absolute',
              top: -15,
              right: -10,
              zIndex: 1,
              transform: [{
                rotate: '20deg'
              }]
            }} />
          </PressableScale>
          {CoefficientHandler.guessSubjectCoefficientEnabled[accountID] && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CornerDownRightIcon size={30} color={theme.colors.onSurface} style={{ marginRight: 5 }} />
              <CustomSimpleInformationCard
                content={"Niveau"}
                icon={<UserRoundIcon size={20} color={theme.colors.onSurfaceDisabled} />}
                rightIcon={(
                  <CustomChooser
                    defaultItem={(
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[theme.fonts.bodyLarge, { marginRight: 5 }]}>{CoefficientHandler.choosenProfiles[accountID] ?? "Choisir..."}</Text>
                        <ChevronsUpDownIcon size={20} color={theme.colors.onSurface} />
                      </View>
                    )}
                    selected={CoefficientHandler.choosenProfiles[accountID]}
                    setSelected={async (profile) => {
                      await CoefficientHandler.setChoosenProfile(accountID, profile);
                      await MarksHandler.recalculateAverageHistory(accountID);
                      updateGlobalDisplay();
                    }}
                    items={Object.keys(CoefficientHandler.profiles).map(key => {
                      return {
                        id: key,
                        title: key,
                      }
                    })}
                  />
                )}
                style={{ marginTop: 5, flexGrow: 1 }}
              />
            </View>
          )}
        </View>
      )}

      {/* Global average and recent marks */}
      <MarksOverview
        selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod}
        latestCurrentPeriod={latestCurrentPeriod} setLatestCurrentPeriod={setLatestCurrentPeriod}
        periods={periods}
        navigation={navigation}
        showAppreciations={showAppreciations}
        setShowAppreciations={setShowAppreciations}
      />

      {/* Subjects */}
      <View style={{ marginTop: 25 }} />
      <SubjectsOverview
        selectedPeriod={selectedPeriod}
        latestCurrentPeriod={latestCurrentPeriod}
        periods={periods}
        navigation={navigation}
        showAppreciations={showAppreciations}
        onAddMark={(subject) => {
          setSelectedSubjectForSim(subject);

          // Lancement direct de la pub sans confirmation
          AdsHandler.showRewardedAd(
            () => { // On Reward
              setAddMarkModalVisible(true);
            },
            () => { // On Closed
              // Rien de spécial
            },
            'create_note'
          );
        }}
      />

      {/* Simulation Modal */}
      {selectedSubjectForSim && (
        <AddMarkModal
          visible={addMarkModalVisible}
          onClose={() => setAddMarkModalVisible(false)}
          subject={selectedSubjectForSim}
          periodID={selectedPeriod}
        />
      )}

      {/* Banner ad at the end of the subjects list */}
      <BannerAdComponent placement="marks" />
    </View>
  );
}

export default EmbeddedMarksPage;