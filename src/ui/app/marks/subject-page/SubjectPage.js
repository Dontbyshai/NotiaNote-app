import { useEffect, useRef } from "react";
import useState from "react-usestateref";
import { Text, View, Dimensions, ScrollView, Platform, Alert } from "react-native";
import { AlertTriangleIcon, ChevronRightIcon, DraftingCompassIcon, EllipsisIcon, EyeIcon, EyeOffIcon, GraduationCapIcon, MegaphoneOffIcon, PaletteIcon, PlusIcon, TrashIcon, TrendingUpIcon, Users2Icon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";
import { LinearGradient } from 'expo-linear-gradient';

import MarkCard from "./MarkCard";
import AddMarkModal from "../AddMarkModal";
import CustomModal from "../../../components/CustomModal";
import CustomSection from "../../../components/CustomSection";
import CustomChooser from "../../../components/CustomChooser";
import CustomEvolutionChart from "../../../components/CustomEvolutionChart";
import CustomCoefficientPicker from "../../../components/CustomCoefficientPicker";
import CustomAnimatedIndicator from "../../../components/CustomAnimatedIndicator";
import CustomSimpleInformationCard from "../../../components/CustomSimpleInformationCard";
import { asyncExpectedResult, formatAverage } from "../../../../util/Utils";
import CoefficientHandler from "../../../../core/CoefficientHandler";
import HapticsHandler from "../../../../core/HapticsHandler";
import ColorsHandler from "../../../../core/ColorsHandler";
import AccountHandler from "../../../../core/AccountHandler";
import MarksHandler from "../../../../core/MarksHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import StorageHandler from "../../../../core/StorageHandler";


// Subject page
function SubjectPage({
  route,
  navigation,
}) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const context = useCurrentAccountContext();
  const accountID = context.accountID || context.account?.id;
  console.log(`[SubjectPage] Context keys: ${Object.keys(context)}, Resolved AccountID: ${accountID}`);

  const { cacheSubject, cacheMark } = route.params;

  // Refresh the shown subject in case of marks refresh
  const [mainSubject, setMainSubject] = useState({}); // Only used for subSubjects
  const [shownSubject, setShownSubject, shownSubjectRef] = useState(cacheSubject);
  const [marks, setMarks] = useState(null);
  // Manual ref to ensure we always have the latest valid AccountID
  const manualAccIDRef = useRef(accountID);

  useEffect(() => {
    StorageHandler.getData("marks").then(async (data) => {
      var cacheData = data ?? {};

      // FALLBACK: If context accountID is missing, use the first available account in storage
      const availableAccounts = Object.keys(cacheData);
      let targetAccID = accountID;

      if ((!targetAccID || !cacheData[targetAccID]) && availableAccounts.length > 0) {
        targetAccID = availableAccounts[0];
        manualAccIDRef.current = targetAccID; // Update ref manually
      } else if (targetAccID) {
        manualAccIDRef.current = targetAccID;
      }

      if (targetAccID in cacheData) {
        let newSubjectData;
        const rawSubjectID = shownSubject.id?.toString();
        const upperSubjectID = rawSubjectID?.toUpperCase();

        const rawSubID = shownSubject.subID?.toString();
        const upperSubID = rawSubID?.toUpperCase();

        const periodData = cacheData[targetAccID]?.data[shownSubject.periodID];

        // Safety check if period exists
        if (periodData && periodData.subjects) {
          const subjects = periodData.subjects;

          // Helper to find subject by ID or UpperID
          const findSubject = (id, upId) => subjects[id] || subjects[upId];

          if (rawSubID || upperSubID) {
            let parentData = findSubject(rawSubjectID, upperSubjectID);
            if (parentData && parentData.subSubjects) {
              newSubjectData = parentData.subSubjects[rawSubID] || parentData.subSubjects[upperSubID];
            }
            setMainSubject(parentData);
          } else {
            newSubjectData = findSubject(rawSubjectID, upperSubjectID);
          }
        }

        if (newSubjectData) {
          setShownSubject(newSubjectData);

          let tempMarks = {};
          for (let markID of newSubjectData.sortedMarks) {
            tempMarks[markID] = cacheData[targetAccID].data[shownSubject.periodID].marks[markID];
          }
          setMarks(tempMarks);
        }
      }
    });
  }, [globalDisplayUpdater, accountID]);

  // Open mark details
  function openMarkDetails(mark) {
    navigation.navigate("MarkPage", {
      cacheMark: mark,
    });
  }

  // Get subject colors
  const { light, dark } = ColorsHandler.getSubjectColors(shownSubject.title || shownSubject.id);
  const [showAddMarkModal, setShowAddMarkModal] = useState(false);

  // Show evolution
  const scrollViewRef = useRef(null);
  const [showEvolution, setShowEvolution] = useState(false);
  useEffect(() => {
    if (showEvolution) {
      scrollViewRef.current?.scrollTo({ x: windowWidth, animated: true });
    } else {
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
    }
  }, [showEvolution]);

  // Changeable coefficient
  const [showCoefPicker, setShowCoefPicker] = useState(false);

  // Helper to find canonical ID (handles YEAR_SUB virtual IDs)
  function getCanonicalSubjectKey(periods, currentSubject) {
    // If it's a real period/ID (not starting with YEAR_SUB), trust it
    if (currentSubject.periodID !== "YEAR" && !currentSubject.id.startsWith("YEAR_SUB")) {
      return currentSubject.subID
        ? `${currentSubject.id}/${currentSubject.subID}`
        : `${currentSubject.id}`;
    }

    // Otherwise, find a matching source subject in a real period
    const realPeriod = Object.values(periods).find(p => p.id !== "YEAR");
    if (!realPeriod) return currentSubject.id; // Fallback

    // Search for subject with same title
    for (const sub of Object.values(realPeriod.subjects)) {
      if (sub.title === currentSubject.title) {
        return sub.id; // Found root subject
      }
      // Check sub-subjects
      for (const subSub of Object.values(sub.subSubjects)) {
        if (subSub.title === currentSubject.title) {
          return `${sub.id}/${subSub.subID}`;
        }
      }
    }

    // Fallback if not found (shouldn't happen if data is consistent)
    return currentSubject.id;
  }

  async function changeCoefficient(newCoefficient) {
    // RESOLVE ACCOUNT ID FRESHLY to avoid any Ref/State staleness
    let targetID = accountID;
    let cacheData = null;

    // Always fetch fresh data to resolving ambiguous IDs and Account
    const storageData = await StorageHandler.getData("marks");
    cacheData = storageData ?? {};

    if (!targetID) {
      const availableAccounts = Object.keys(cacheData);
      if (availableAccounts.length > 0) {
        targetID = availableAccounts[0];
      }
    }

    if (!targetID) {
      Alert.alert("Erreur", "Compte introuvable. Impossible de sauvegarder.");
      return;
    }

    // Resolve Keys: Canonical (for consistency) AND Virtual (for Year tab display)
    const periods = cacheData[targetID]?.data || {};
    const canonicalKey = getCanonicalSubjectKey(periods, shownSubject);
    const virtualKey = shownSubject.subID
      ? `${shownSubject.id}/${shownSubject.subID}`
      : `${shownSubject.id}`;

    // Deduplicate keys
    const keysToUpdate = [...new Set([canonicalKey, virtualKey])];

    console.log(`[SubjectPage] Saving Coef. Account:${targetID} Keys:${keysToUpdate.join(',')} Val:${newCoefficient}`);

    try {
      for (const key of keysToUpdate) {
        await MarksHandler.setCustomData(
          targetID,
          "subjects",
          key,
          "coefficient",
          newCoefficient,
        );
      }
      await MarksHandler.recalculateAverageHistory(targetID);
      updateGlobalDisplay();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Echec de la sauvegarde: " + e.message);
    }
  }

  async function resetCustomCoefficient() {
    let targetID = accountID;
    const storageData = await StorageHandler.getData("marks");
    const cacheData = storageData ?? {};

    if (!targetID) {
      const availableAccounts = Object.keys(cacheData);
      if (availableAccounts.length > 0) {
        targetID = availableAccounts[0];
      }
    }
    if (!targetID) return;

    const periods = cacheData[targetID]?.data || {};
    const canonicalKey = getCanonicalSubjectKey(periods, shownSubject);
    const virtualKey = shownSubject.subID
      ? `${shownSubject.id}/${shownSubject.subID}`
      : `${shownSubject.id}`;

    const keysToUpdate = [...new Set([canonicalKey, virtualKey])];

    for (const key of keysToUpdate) {
      await MarksHandler.removeCustomData(
        targetID,
        "subjects",
        key,
        "coefficient",
      );
    }
    await MarksHandler.recalculateAverageHistory(targetID);
    updateGlobalDisplay();
  }

  // Is subject effective
  const [isEffective, setIsEffective] = useState(shownSubject.isEffective ?? true);
  function toggleIsEffective() {
    let targetID = accountID;

    // We can't use await here easily inside the synchronous part of toggle,
    // but asyncExpectedResult handles the async function.
    // We'll move the resolution inside the async block.

    asyncExpectedResult(
      async () => {
        // Resolve ID inside
        const storageData = await StorageHandler.getData("marks");
        const cacheData = storageData ?? {};

        if (!targetID) {
          const availableAccounts = Object.keys(cacheData);
          if (availableAccounts.length > 0) {
            targetID = availableAccounts[0];
          }
        }
        if (!targetID) throw new Error("No Account ID");

        const periods = cacheData[targetID]?.data || {};
        const canonicalKey = getCanonicalSubjectKey(periods, shownSubject);
        const virtualKey = shownSubject.subID
          ? `${shownSubject.id}/${shownSubject.subID}`
          : `${shownSubject.id}`;

        const keysToUpdate = [...new Set([canonicalKey, virtualKey])];

        for (const key of keysToUpdate) {
          await MarksHandler.setCustomData(
            targetID,
            "subjects",
            key,
            "isEffective",
            !shownSubject.isEffective,
          );
        }
        await MarksHandler.recalculateAverageHistory(targetID);
      },
      () => updateGlobalDisplay(),
      () => setIsEffective(!shownSubject.isEffective),
    );
  }

  // Custom settings
  const [countMarksWithOnlyCompetences, setCountMarksWithOnlyCompetences] = useState(false);
  useEffect(() => {
    AccountHandler.getPreference("countMarksWithOnlyCompetences").then(setCountMarksWithOnlyCompetences);
  }, [globalDisplayUpdater]);

  // Chart
  const [showClassValueOnChart, setShowClassValueOnChart] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Platform.isPad ? 0 : Dimensions.get('window').width);

  // --- Redesigned Layout ---

  // Helper Header
  const Header = () => (
    <View style={{ paddingTop: 0, paddingHorizontal: 20, paddingBottom: 15, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 0 : 40 }}>
        <PressableScale onPress={() => navigation.pop()} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 }}>
          <ChevronRightIcon size={24} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
        </PressableScale>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
            {shownSubject.subID ? mainSubject.title : shownSubject.title}
          </Text>
          {shownSubject.subID && (
            <Text style={{ color: dark, fontSize: 12, fontFamily: 'Text-Medium' }}>
              {shownSubject.title}
            </Text>
          )}
        </View>

        <PressableScale onPress={() => setShowChangeColorModal(true)} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 }}>
          <PaletteIcon size={20} color={light} />
        </PressableScale>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Background */}
      <LinearGradient
        colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
      />
      {/* Accent Gradient Orb */}
      <View style={{
        position: 'absolute', top: -100, right: -100, width: 300, height: 300,
        borderRadius: 150, backgroundColor: dark, opacity: 0.15, blurRadius: 50
      }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header - No Title, handled in card */}
        <View style={{ paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <PressableScale onPress={() => navigation.pop()} style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 14 }}>
            <ChevronRightIcon size={24} color={theme.dark ? "#FFF" : theme.colors.onBackground} style={{ transform: [{ rotate: '180deg' }] }} />
          </PressableScale>
          <PressableScale onPress={() => setShowAddMarkModal(true)} style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 14, marginLeft: 10 }}>
            <PlusIcon size={20} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
          </PressableScale>
        </View>

        {/* Add Mark Modal */}
        {showAddMarkModal && (
          <AddMarkModal
            visible={showAddMarkModal}
            onClose={() => setShowAddMarkModal(false)}
            subject={shownSubject}
            periodID={shownSubject.periodID}
            targetAccountID={manualAccIDRef.current || accountID}
          />
        )}

        {/* Hero Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <LinearGradient
            colors={[light, dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 32, padding: 25,
              shadowColor: light, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
              elevation: 10
            }}
          >
            {/* Card Header */}
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 28, color: '#FFF', fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
                {shownSubject.title}
              </Text>
              {shownSubject.teachers?.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, opacity: 0.9 }}>
                  <GraduationCapIcon size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'Text-Medium' }}>
                    {shownSubject.teachers[0]}
                  </Text>
                </View>
              )}
            </View>

            {/* Card Bottom: Average & Stats */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <PressableScale onPress={() => setShowCoefPicker(true)}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 10, fontFamily: 'Text-Medium' }}>MOYENNE (Coeff: {shownSubject.coefficient || 1})</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 48, color: '#FFF', fontFamily: 'Text-Bold', fontWeight: 'bold', lineHeight: 56, opacity: shownSubject.isEffective ? 1 : 0.5 }}>
                    {shownSubject.isEffective ? "" : "("}
                    {formatAverage(shownSubject?.average)}
                    {shownSubject.isEffective ? "" : ")"}
                  </Text>
                  <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', marginLeft: 10 }}>/20</Text>
                </View>
                {shownSubject.classAverage && (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                    Classe: {formatAverage(shownSubject.classAverage)}
                  </Text>
                )}
              </PressableScale>

              {/* Mini Graph Container */}
              <View style={{
                width: 120, height: 60,
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 16, overflow: 'hidden',
                padding: 5
              }}>
                <CustomEvolutionChart
                  listOfValues={shownSubject.averageHistory}
                  showClassValues={false}
                  color="#FFF"
                  lightColor="rgba(255,255,255,0.2)"
                  activeColor="#FFF"
                  height={50}
                  windowWidth={110}
                  minimalist={true}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Modal for Coefficient */}
        {showCoefPicker && (
          <CustomCoefficientPicker
            visible={showCoefPicker}
            exitModal={() => setShowCoefPicker(false)}
            onConfirm={(val) => { setShowCoefPicker(false); changeCoefficient(val); }}
            originalValue={shownSubject.coefficient || 1}
          />
        )}

        {/* Marks List */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ color: theme.dark ? '#E2E8F0' : theme.colors.onSurface, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Notes récentes</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Text-Medium' }}>
                {marks ? Object.keys(marks).length : 0}
              </Text>
            </View>
          </View>

          {marks && shownSubject?.sortedMarks?.map((markID) => (
            <MarkCard
              key={markID}
              mark={marks[markID]}
              subjectTitle={
                Object.keys(shownSubject.subSubjects).length > 0 &&
                shownSubject.subSubjects[marks[markID].subSubjectID].title
              }
              openMarkDetails={() => openMarkDetails(marks[markID])}
              outline={markID == cacheMark?.id}
              windowWidth={Dimensions.get('window').width}
              countMarksWithOnlyCompetences={countMarksWithOnlyCompetences}
            />
          ))}

          {marks && shownSubject?.sortedMarks?.length === 0 && (
            <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 20 }}>Aucune note pour le moment.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Settings Button */}
      <PressableScale
        onPress={() => {
          // Show settings modal or sheet
          Alert.alert("Options", "Options de matière", [
            { text: "Annuler", style: "cancel" },
            {
              text: shownSubject.isEffective ? "Désactiver la matière" : "Activer la matière",
              style: shownSubject.isEffective ? "destructive" : "default",
              onPress: toggleIsEffective
            }
          ])
        }}
        style={{
          position: 'absolute', bottom: 40, right: 20,
          width: 50, height: 50, borderRadius: 25,
          backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10
        }}
      >
        <EllipsisIcon size={24} color="#FFF" />
      </PressableScale>

      {/* Modals */}
    </View>
  );
}


export default SubjectPage;