import { useEffect, useState } from "react";
import { View, Text, Platform, Dimensions, Switch, Alert, ScrollView } from "react-native";
import { PressableScale } from "react-native-pressable-scale";
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarIcon, ChevronRightIcon, EllipsisIcon, LandPlotIcon, MegaphoneIcon, MegaphoneOffIcon, MessageSquareIcon, MinusIcon, PenToolIcon, PlusIcon, TrendingDownIcon, TrendingUpIcon, TrashIcon, Users2Icon } from "lucide-react-native";

import CustomModal from "../../../components/CustomModal";
import CustomSection from "../../../components/CustomSection";
import CustomChooser from "../../../components/CustomChooser";
import CustomCoefficientPicker from "../../../components/CustomCoefficientPicker";
import CustomSimpleInformationCard from "../../../components/CustomSimpleInformationCard";
import { asyncExpectedResult, formatAverage, formatDate2, formatMark } from "../../../../util/Utils";
import CoefficientHandler from "../../../../core/CoefficientHandler";
import ColorsHandler from "../../../../core/ColorsHandler";
import AccountHandler from "../../../../core/AccountHandler";
import MarksHandler from "../../../../core/MarksHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import StorageHandler from "../../../../core/StorageHandler";


// Mark page
function MarkPage({ navigation, route }) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { accountID, mainAccount } = useCurrentAccountContext();

  const { cacheMark } = route.params;

  // Auto-refresh info
  const [mark, setMark] = useState(cacheMark);
  useEffect(() => {
    StorageHandler.getData("marks").then((data) => {
      var cacheData = data ?? {};
      if (accountID in cacheData) {
        setMark(cacheData[accountID].data[mark.periodID].marks[mark.id]);
      }
    });
  }, [globalDisplayUpdater]);

  // Change mark coefficient
  async function changeCoefficient(newCoefficient) {
    await MarksHandler.setCustomData(
      accountID,
      "marks",
      `${mark.id}`,
      "coefficient",
      newCoefficient,
      mark.periodID,
    );
    await MarksHandler.recalculateAverageHistory(accountID);
    updateGlobalDisplay();
  }
  async function resetCustomCoefficient() {
    await MarksHandler.removeCustomData(
      accountID,
      "marks",
      `${mark.id}`,
      "coefficient",
      mark.periodID,
    );
    await MarksHandler.recalculateAverageHistory(accountID);
    updateGlobalDisplay();
  }

  // Change if mark is effective
  const [isEffective, setIsEffective] = useState(mark.isEffective ?? true);
  function toggleIsEffective() {
    asyncExpectedResult(
      async () => {
        await MarksHandler.setCustomData(
          accountID,
          "marks",
          mark.id,
          "isEffective",
          !mark.isEffective,
          mark.periodID,
        );
        await MarksHandler.recalculateAverageHistory(accountID);
      },
      () => updateGlobalDisplay(),
      () => setIsEffective(!mark.isEffective),
    );
  }

  // Delete simulation
  function deleteSimulatedMark() {
    Alert.alert(
      "Supprimer la simulation",
      "Voulez-vous vraiment supprimer cette note simulée ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await MarksHandler.removeSimulatedMark(accountID, mark.id);
            await MarksHandler.recalculateAverageHistory(accountID);
            updateGlobalDisplay();
            navigation.goBack();
          }
        }
      ]
    );
  }

  // Custom settings
  const [countMarksWithOnlyCompetences, setCountMarksWithOnlyCompetences] = useState(false);
  useEffect(() => {
    AccountHandler.getPreference("countMarksWithOnlyCompetences").then(setCountMarksWithOnlyCompetences);
  }, [globalDisplayUpdater]);

  // Get subject colors
  const { light, dark } = ColorsHandler.getSubjectColors(mark.subjectID);
  const [windowWidth, setWindowWidth] = useState(Platform.isPad ? 0 : Dimensions.get('window').width);

  // --- Galaxy Layout ---

  const Header = () => (
    <View style={{ paddingTop: 0, paddingHorizontal: 20, paddingBottom: 15, zIndex: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 0 : 40 }}>
        <PressableScale onPress={() => navigation.goBack()} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 12 }}>
          <ChevronRightIcon size={24} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
        </PressableScale>

        <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
          Détails
        </Text>

        <View style={{ width: 40 }} />
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
      {/* Accent Glow */}
      <View style={{
        position: 'absolute', top: -100, right: -50, width: 250, height: 250,
        borderRadius: 125, backgroundColor: dark, opacity: 0.15, blurRadius: 50
      }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <PressableScale onPress={() => navigation.goBack()} style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 14 }}>
            <ChevronRightIcon size={24} color={theme.dark ? "#FFF" : theme.colors.onBackground} style={{ transform: [{ rotate: '180deg' }] }} />
          </PressableScale>
          <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onSurface, fontSize: 16, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>Détails de la note</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <LinearGradient
            colors={!mark.isEffective ? ['#64748B', '#475569'] : [light, dark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 32, padding: 25,
              shadowColor: !mark.isEffective ? '#64748B' : light,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', fontFamily: 'Text-Bold', fontWeight: 'bold', marginBottom: 4 }}>
                  {formatDate2(mark.date)}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Text-Medium' }}>
                  {mark.title ? mark.title : "Devoir"}
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Coef. {mark.coefficient ?? 1}</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 64, color: '#FFF', fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
                  {!mark.isEffective && mark.valueStr ? '(' : ''}
                  {mark.valueStr ? mark.valueStr : "--"}
                  {!mark.isEffective && mark.valueStr ? ')' : ''}
                </Text>
                <Text style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>
                  {mark.valueOn ? `/${mark.valueOn}`.replace(".", ",") : "/--"}
                </Text>
              </View>
              {mark.classValue && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, opacity: 0.8 }}>
                  <Users2Icon size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontSize: 13 }}>
                    Moyenne classe: {formatMark(mark, true)}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Content Container */}
        <View style={{ paddingHorizontal: 20 }}>

          {/* Title Card */}
          <View style={{
            backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
            borderRadius: 20, padding: 20, marginBottom: 20,
            borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}>
            <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onSurface, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 }}>
              {mark.title}
            </Text>

            {/* Coefficient */}
            <View style={{ alignItems: 'center', paddingBottom: 10 }}>
              <CustomCoefficientPicker
                coefficient={mark.coefficient ?? 1}
                setCoefficient={changeCoefficient}
                resetCoefficient={resetCustomCoefficient}
                isCustom={mark.isCustomCoefficient}
                isGuessed={CoefficientHandler.guessMarkCoefficientEnabled[accountID]}
                openGuessParametersPage={() => {
                  if (CoefficientHandler.guessMarkCoefficientEnabled[accountID] && !mark.isCustomCoefficient) {
                    navigation.navigate('SettingsStack', {
                      screen: 'CoefficientsPage',
                    });
                  }
                }}
                dark={dark}
              />
            </View>
          </View>

          {/* Informations Group */}
          <View style={{ marginBottom: 25 }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1, paddingLeft: 10 }}>INFORMATIONS</Text>

            <View style={{
              backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
              borderRadius: 16,
              borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }}>
              <CustomSimpleInformationCard
                icon={<CalendarIcon size={20} color={dark} />}
                content={"Date"}
                rightIcon={<Text style={{ color: theme.dark ? '#E2E8F0' : theme.colors.onSurface }}>{formatDate2(mark.date)}</Text>}
                style={{ borderBottomWidth: 1, borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backgroundColor: 'transparent' }}
              />
              {mark.type && (
                <CustomSimpleInformationCard
                  icon={<PenToolIcon size={20} color={dark} />}
                  content={"Type"}
                  rightIcon={<Text style={{ color: theme.dark ? '#E2E8F0' : theme.colors.onSurface }}>{mark.type}</Text>}
                  style={{ backgroundColor: 'transparent' }}
                />
              )}
            </View>
          </View>

          {/* Competences */}
          {mark.competences?.length > 0 && (
            <View style={{ marginBottom: 25 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1, paddingLeft: 10 }}>COMPÉTENCES</Text>
              {mark.competences.map((comp, i) => (
                <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 16, marginBottom: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', marginBottom: 4 }}>{comp.title}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>{comp.description}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
                    <View style={{
                      width: 12, height: 12, borderRadius: 6, marginRight: 8,
                      backgroundColor: comp.value <= 1 ? theme.colors.error : comp.value == 2 ? "#FFC300" : comp.value == 3 ? theme.colors.primary : "#10B981"
                    }} />
                    <Text style={{ color: '#E2E8F0', fontSize: 12 }}>
                      {comp.value <= 0 ? "N/A" : comp.value == 1 ? "Maîtrise insuffisante" : comp.value == 2 ? "Maîtrise fragile" : comp.value == 3 ? "Maîtrise satisfaisante" : "Très bonne maîtrise"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Influence Group */}
          {(mark.generalAverageInfluence || mark.subjectAverageInfluence) && (
            <View style={{ marginBottom: 25 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1, paddingLeft: 10 }}>INFLUENCE SUR LA MOYENNE</Text>
              <View style={{
                backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
                borderRadius: 16,
                borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }}>
                {mark.subjectAverageInfluence && (
                  <CustomSimpleInformationCard
                    content={"Matière"}
                    icon={mark.subjectAverageInfluence > 0 ? <TrendingUpIcon size={20} color="#10B981" /> : <TrendingDownIcon size={20} color="#EF4444" />}
                    rightIcon={
                      <Text style={{ color: mark.subjectAverageInfluence > 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                        {mark.subjectAverageInfluence > 0 ? "+" : ""}{formatAverage(mark.subjectAverageInfluence)}
                      </Text>
                    }
                    style={{ borderBottomWidth: mark.generalAverageInfluence ? 1 : 0, borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backgroundColor: 'transparent' }}
                  />
                )}
                {mark.generalAverageInfluence && (
                  <CustomSimpleInformationCard
                    content={"Moyenne Générale"}
                    icon={mark.generalAverageInfluence > 0 ? <TrendingUpIcon size={20} color="#10B981" /> : <TrendingDownIcon size={20} color="#EF4444" />}
                    rightIcon={
                      <Text style={{ color: mark.generalAverageInfluence > 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                        {mark.generalAverageInfluence > 0 ? "+" : ""}{formatAverage(mark.generalAverageInfluence)}
                      </Text>
                    }
                    style={{ backgroundColor: 'transparent' }}
                  />
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={{ marginBottom: 50 }}>
            <View style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
              zIndex: 1
            }}>
              <CustomSimpleInformationCard
                icon={isEffective ? <MegaphoneIcon size={20} color="#EF4444" /> : <MegaphoneOffIcon size={20} color="#EF4444" />}
                content="Désactiver la note"
                textStyle={{ color: '#EF4444' }}
                style={{ backgroundColor: 'transparent' }}
                rightIcon={
                  <Switch
                    value={!isEffective}
                    onValueChange={toggleIsEffective}
                    trackColor={{ false: "#334155", true: "#EF4444" }}
                    ios_backgroundColor="#334155"
                  />
                }
              />
            </View>

            {/* DELETE SIMULATION */}
            {mark.isSimulated && (
              <View style={{
                marginTop: 30,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
                zIndex: 50,
              }}>
                <PressableScale onPress={deleteSimulatedMark} style={{ padding: 15, flexDirection: 'row', alignItems: 'center' }}>
                  <TrashIcon size={20} color="#EF4444" style={{ marginRight: 10 }} />
                  <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold' }}>Supprimer la simulation</Text>
                </PressableScale>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}


export default MarkPage;