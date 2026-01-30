import { useEffect, useRef } from "react";
import useState from "react-usestateref";
import { Text, View, Dimensions, ScrollView, Platform } from "react-native";
import { AlertTriangleIcon, ChevronRightIcon, DraftingCompassIcon, EllipsisIcon, EyeIcon, EyeOffIcon, GraduationCapIcon, MegaphoneOffIcon, PaletteIcon, TrashIcon, TrendingUpIcon, Users2Icon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";
import { LinearGradient } from 'expo-linear-gradient';

import MarkCard from "./MarkCard";
import SubjectColorPicker from "./SubjectColorPicker";
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
  const { accountID } = useCurrentAccountContext();

  const { cacheSubject, cacheMark } = route.params;

  // Refresh the shown subject in case of marks refresh
  const [mainSubject, setMainSubject] = useState({}); // Only used for subSubjects
  const [shownSubject, setShownSubject, shownSubjectRef] = useState(cacheSubject);
  const [marks, setMarks] = useState(null);
  useEffect(() => {
    StorageHandler.getData("marks").then(async (data) => {
      var cacheData = data ?? {};
      if (accountID in cacheData) {
        let newSubjectData;
        if (shownSubject.subID) {
          newSubjectData = cacheData[accountID].data[shownSubject.periodID].subjects[shownSubject.id].subSubjects[shownSubject.subID];
          setMainSubject(cacheData[accountID].data[shownSubject.periodID].subjects[shownSubject.id]);
        } else {
          newSubjectData = cacheData[accountID].data[shownSubject.periodID].subjects[shownSubject.id];
        }

        setShownSubject(newSubjectData);

        let tempMarks = {};
        for (let markID of newSubjectData.sortedMarks) {
          tempMarks[markID] = cacheData[accountID].data[shownSubject.periodID].marks[markID];
        }
        setMarks(tempMarks);
      }
    });
  }, [globalDisplayUpdater]);

  // Open mark details
  function openMarkDetails(mark) {
    navigation.navigate("MarkPage", {
      cacheMark: mark,
    });
  }

  // Get subject colors
  const { light, dark } = ColorsHandler.getSubjectColors(shownSubject.title || shownSubject.id);
  const [showChangeColorModal, setShowChangeColorModal] = useState(false);
  function resetColor() {
    ColorsHandler.removeSubjectColor(shownSubject.title || shownSubject.id);
    updateGlobalDisplay();
    HapticsHandler.vibrate("light");
  }

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
  async function changeCoefficient(newCoefficient) {
    await MarksHandler.setCustomData(
      accountID,
      "subjects",
      `${shownSubject.id}/${shownSubject.subID ?? ""}`,
      "coefficient",
      newCoefficient,
    );
    await MarksHandler.recalculateAverageHistory(accountID);
    updateGlobalDisplay();
  }
  async function resetCustomCoefficient() {
    await MarksHandler.removeCustomData(
      accountID,
      "subjects",
      `${shownSubject.id}/${shownSubject.subID ?? ""}`,
      "coefficient",
    );
    await MarksHandler.recalculateAverageHistory(accountID);
    updateGlobalDisplay();
  }

  // Is subject effective
  const [isEffective, setIsEffective] = useState(shownSubject.isEffective ?? true);
  function toggleIsEffective() {
    asyncExpectedResult(
      async () => {
        await MarksHandler.setCustomData(
          accountID,
          "subjects",
          `${shownSubject.id}/${shownSubject.subID ?? ""}`,
          "isEffective",
          !shownSubject.isEffective,
        );
        await MarksHandler.recalculateAverageHistory(accountID);
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
          <PressableScale onPress={() => setShowChangeColorModal(true)} style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 14 }}>
            <PaletteIcon size={20} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
          </PressableScale>
        </View>

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
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 10, fontFamily: 'Text-Medium' }}>MOYENNE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 48, color: '#FFF', fontFamily: 'Text-Bold', fontWeight: 'bold', lineHeight: 56 }}>
                    {formatAverage(shownSubject?.average)}
                  </Text>
                  <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', marginLeft: 10 }}>/20</Text>
                </View>
                {shownSubject.classAverage && (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
                    Classe: {formatAverage(shownSubject.classAverage)}
                  </Text>
                )}
              </View>

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

        {/* Marks List */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ color: theme.dark ? '#E2E8F0' : theme.colors.onSurface, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Notes récentes</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>{marks ? Object.keys(marks).length : 0} notes</Text>
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
            { text: "Désactiver la matière", style: "destructive", onPress: toggleIsEffective }
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
      {showChangeColorModal && (
        <SubjectColorPicker
          subjectID={shownSubject.title || shownSubject.id}
          visible={showChangeColorModal}
          exitModal={() => setShowChangeColorModal(false)}
          initialValue={dark}
          windowWidth={Dimensions.get('window').width}
        />
      )}
    </View>
  );
}


export default SubjectPage;