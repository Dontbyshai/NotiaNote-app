import { useEffect, useState } from "react";
import { View, Platform, Dimensions, Text, Switch, ActivityIndicator, StyleSheet } from "react-native";
import { AlertTriangleIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, EllipsisIcon, GraduationCapIcon, LibraryIcon, ListTodoIcon, SwatchBookIcon, XIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";
import { LinearGradient } from 'expo-linear-gradient';

import CustomModal from "../../components/CustomModal";
import CustomSection from "../../components/CustomSection";
import CustomChooser from "../../components/CustomChooser";
import CustomSeparator from "../../components/CustomSeparator";
import CustomFileAttachment from "../../components/CustomFileAttachment";
import CustomSimpleInformationCard from "../../components/CustomSimpleInformationCard";
import CustomHtmlRender from "../../components/CustomHtmlRender";
import HomeworkHandler from "../../../core/HomeworkHandler";
import AccountHandler from "../../../core/AccountHandler";
import ColorsHandler from "../../../core/ColorsHandler";
import HapticsHandler from "../../../core/HapticsHandler";
import { useGlobalAppContext } from "../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../util/AppStackContext";
import { asyncExpectedResult, formatDate, formatDate2 } from "../../../util/Utils";
import { useCurrentAccountContext } from "../../../util/CurrentAccountContext";
import StorageHandler from "../../../core/StorageHandler";
import BannerAdComponent from "../../components/Ads/BannerAdComponent";


// homework page
function HomeworkPage({ navigation, route }) {
  const { theme } = useGlobalAppContext();
  const { isConnected, globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { accountID: contextAccountID, mainAccount } = useCurrentAccountContext();
  // Fix: Calculate effective ID to handle cases where contextAccountID is undefined
  const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);

  const { cacheHomework, cacheSpecificHomework } = route.params;

  // Auto-update the cache homework
  const [homework, setHomework] = useState(cacheHomework);
  async function loadHomework() {
    StorageHandler.getData("homework").then(data => {
      var cacheData = data ?? {};
      if (accountID in cacheData) {
        setHomework(cacheData[accountID].data.homeworks[cacheHomework.id]);
      }
    });
  }
  useEffect(() => { loadHomework(); }, [globalDisplayUpdater]);

  // Auto-update the specific homework, and auto-load on page open
  const [specificHomework, setSpecificHomework] = useState(cacheSpecificHomework);
  const [lastTimeUpdatedSpecificHomework, setLastTimeUpdatedSpecificHomework] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(false);
  async function getCacheSpecificHomework() {
    const cacheData = await StorageHandler.getData("specific-homework");
    if (cacheData) {
      if (accountID in cacheData && homework.dateFor in cacheData[accountID].days && homework.id in cacheData[accountID].homeworks) {
        setSpecificHomework(cacheData[accountID].homeworks[homework.id]);
        setLastTimeUpdatedSpecificHomework(cacheData[accountID].days[homework.dateFor].date);
        setErrorLoading(false);
        return 1;
      }
    }
    return -1;
  }
  async function loadSpecificHomework(force = false) {
    // Check if specific homework is in cache
    if (!force) {
      let status = await getCacheSpecificHomework();
      if (status == 1) {
        setIsLoading(false);
        return;
      }
    }

    if (!isConnected) { return; }

    // Fetch specific homework
    setIsLoading(true);
    const status = await HomeworkHandler.getSpecificHomeworkForDay(accountID, homework.dateFor);
    if (status == 1) {
      await getCacheSpecificHomework();
      updateGlobalDisplay();
    }
    else { setErrorLoading(true); }
    setIsLoading(false);
  }
  useEffect(() => { loadSpecificHomework(); }, [globalDisplayUpdater]);

  // Change homework done status
  const [isDone, setIsDone] = useState(homework?.done ?? false);
  const [isSettingDone, setIsSettingDone] = useState(false);
  function toggleDone() {
    HapticsHandler.vibrate("light");
    setIsSettingDone(true);
    asyncExpectedResult(
      async () => await HomeworkHandler.markHomeworkAsDone(accountID, homework.id, !isDone),
      (done) => {
        setIsDone(done);
        setIsSettingDone(false);
        updateGlobalDisplay();
      },
      () => setIsDone(!isDone),
    );
  }

  // Collapse the sections or not, is persistent
  const [isTodoCollapsed, setIsTodoCollapsed] = useState(false);
  const [isSessionContentCollapsed, setIsSessionContentCollapsed] = useState(false);
  useEffect(() => {
    AccountHandler.getPreference("homework-collapse").then(data => {
      if (data) {
        setIsTodoCollapsed(data.todo);
        setIsSessionContentCollapsed(data.sessionContent);
      }
    });
  }, []);
  useEffect(() => {
    AccountHandler.setPreference("homework-collapse", {
      "todo": isTodoCollapsed,
      "sessionContent": isSessionContentCollapsed,
    });
  }, [isTodoCollapsed, isSessionContentCollapsed]);

  // Get subject colors
  const { dark } = ColorsHandler.getSubjectColors(homework?.subjectID, homework?.subjectTitle);
  const [windowWidth, setWindowWidth] = useState(Platform.isPad ? 0 : Dimensions.get('window').width);

  // Guard: if homework is null, show loading
  if (!homework) {
    return (
      <CustomModal
        goBackFunction={() => navigation.goBack()}
        title={"Détails du devoir"}
        headerStyle={{ backgroundColor: theme.colors.background, borderBottomWidth: 0 }}
        titleStyle={{ color: theme.colors.onBackground }}
        background={theme.colors.background}
        horizontalPadding={0}
        backButtonColor={theme.colors.onBackground}
        children={(
          <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <ActivityIndicator size={30} color={theme.colors.primary} />
            <Text style={{ marginTop: 10, color: '#94A3B8', fontSize: 16 }}>Chargement...</Text>
          </View>
        )}
      />
    );
  }

  return (
    <CustomModal
      goBackFunction={() => navigation.goBack()}

      // Galaxy Header Props
      headerStyle={{ backgroundColor: theme.colors.primaryLight, borderBottomWidth: 0, borderBottomColor: 'rgba(255,255,255,0.05)' }}
      titleStyle={{ color: theme.colors.onBackground, fontWeight: 'bold' }}
      background={theme.colors.background}
      horizontalPadding={0}
      backButtonColor={theme.colors.onBackground}
      goBackButtonStyle={{ opacity: 1 }}
      leftIconColor={theme.colors.onBackground}

      setWidth={setWindowWidth}
      title={"Détails du devoir"}
      style={{ paddingVertical: 0 }}

      rightIconStyle={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 8 }}
      rightIcon={isLoading ? (
        <ActivityIndicator size={20} color={'#F8FAFC'} />
      ) : (
        <CustomChooser
          title={"Options"}
          defaultItem={<EllipsisIcon size={22} color={'#F8FAFC'} />}
          items={[
            { title: "Code devoir", subtitle: `${homework.id}` },
            {
              title: "Actualiser", onPress: () => loadSpecificHomework(true), icon: {
                ios: 'arrow.clockwise',
              }
            },
            {
              title: isDone ? "Marquer comme non fait" : "Marquer comme fait", onPress: toggleDone, icon: {
                ios: homework?.done ? 'xmark.circle' : 'checkmark.circle',
                android: homework?.done ? 'ic_delete' : 'ic_input_add',
              }
            },
          ]}
        />
      )}
      children={(
        <View style={{ backgroundColor: theme.colors.background, minHeight: Dimensions.get('window').height, padding: 20 }}>
          <LinearGradient
            colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]}
            style={StyleSheet.absoluteFill}
          />

          {/* Header Card (Matière + Date) */}
          <View style={{
            backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderLeftWidth: 3,
            borderLeftColor: dark || theme.colors.primary,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ color: dark || theme.colors.primary, fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                {homework.subjectTitle}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <CalendarIcon size={18} color="#94A3B8" style={{ marginRight: 10 }} />
              <Text style={{ color: theme.dark ? '#E2E8F0' : '#64748B', fontSize: 17 }}>
                Pour le <Text style={{ fontWeight: 'bold', color: theme.dark ? '#F8FAFC' : '#000000' }}>{formatDate2(homework.dateFor, false, true)}</Text>
              </Text>
            </View>

            {homework.isExam && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <AlertTriangleIcon size={16} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>ÉVALUATION</Text>
              </View>
            )}
          </View>

          {/* Status Switch Card */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: isDone ? (theme.dark ? 'rgba(34, 197, 94, 0.05)' : '#F0FDF4') : 'transparent',
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 18,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: isDone ? 'rgba(34, 197, 94, 0.3)' : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: isDone ? '#22C55E' : 'rgba(255,255,255,0.1)',
                justifyContent: 'center', alignItems: 'center', marginRight: 14
              }}>
                {isSettingDone ? <ActivityIndicator size={16} color="#FFF" /> : isDone ? <CheckIcon size={18} color="#FFF" /> : <XIcon size={18} color="#94A3B8" />}
              </View>
              <Text style={{ color: isDone ? (theme.dark ? '#F0FDF4' : '#166534') : (theme.dark ? '#F8FAFC' : '#000000'), fontSize: 17, fontWeight: '600' }}>
                {isDone ? "Terminé" : "Marquer comme fait"}
              </Text>
            </View>
            <Switch
              value={isDone}
              onValueChange={toggleDone}
              trackColor={{ false: "#334155", true: "rgba(34, 197, 94, 0.5)" }}
              thumbColor={isDone ? "#22C55E" : "#94A3B8"}
            />
          </View>

          {/* Error State */}
          {errorLoading && (
            <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, marginBottom: 20 }}>
              <AlertTriangleIcon size={24} color="#EF4444" />
              <Text style={{ color: '#EF4444', marginTop: 10, fontWeight: 'bold' }}>Impossible de charger les détails.</Text>
            </View>
          )}

          {/* Content Loading */}
          {!errorLoading && !specificHomework && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size={30} color={theme.colors.primary} />
            </View>
          )}

          {/* Loaded Details */}
          {!errorLoading && specificHomework && (
            <>
              {/* Todo Section */}
              <View style={{ marginBottom: 20 }}>
                <PressableScale
                  onPress={() => setIsTodoCollapsed(!isTodoCollapsed)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ListTodoIcon size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.dark ? '#F8FAFC' : theme.colors.onBackground, fontSize: 17, fontWeight: 'bold' }}>Tâches à faire</Text>
                  </View>
                  {isTodoCollapsed ? <ChevronRightIcon size={20} color="#64748B" /> : <ChevronDownIcon size={20} color="#64748B" />}
                </PressableScale>

                {!isTodoCollapsed && (
                  <View style={{
                    backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}>
                    <CustomHtmlRender
                      html={specificHomework?.todo}
                      baseStyle={{ color: theme.dark ? '#E2E8F0' : '#1E293B', fontSize: 15, lineHeight: 24 }}
                    />
                  </View>
                )}
              </View>

              {/* Session Content Section */}
              {specificHomework?.sessionContent && (
                <View style={{ marginBottom: 20 }}>
                  <PressableScale
                    onPress={() => setIsSessionContentCollapsed(!isSessionContentCollapsed)}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <LibraryIcon size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                      <Text style={{ color: '#F8FAFC', fontSize: 17, fontWeight: 'bold' }}>Contenu de séance</Text>
                    </View>
                    {isSessionContentCollapsed ? <ChevronRightIcon size={20} color="#64748B" /> : <ChevronDownIcon size={20} color="#64748B" />}
                  </PressableScale>

                  {!isSessionContentCollapsed && (
                    <View style={{
                      backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)'
                    }}>
                      <CustomHtmlRender
                        html={specificHomework?.sessionContentHtml || specificHomework?.sessionContent}
                        baseStyle={{ color: '#E2E8F0', fontSize: 15, lineHeight: 24 }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Attachment Files */}
              {specificHomework?.files && specificHomework.files.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', paddingHorizontal: 4 }}>FICHIERS JOINTS (NOUVEAU)</Text>
                  {specificHomework.files.map((file, idx) => (
                    <CustomFileAttachment
                      key={idx}
                      file={file}
                      color={dark}
                      windowWidth={windowWidth}
                      style={{ marginBottom: 8 }} // Pas de style custom profond sur ce composant, on fait confiance
                    />
                  ))}
                </View>
              )}

              {/* Metadata Footer */}
              <View style={{ marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingBottom: 50 }}>
                <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 }}>
                  Donné le {formatDate2(homework.dateGiven)} par {specificHomework?.givenBy || "Professeur inconnu"}
                </Text>
                <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 5 }}>
                  Mis à jour : {formatDate(lastTimeUpdatedSpecificHomework)}
                </Text>
              </View>

              <BannerAdComponent placement="homework_detail" />
            </>
          )}
        </View>
      )}
    />
  );
}

export default HomeworkPage;