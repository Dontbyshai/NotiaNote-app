import { memo, useEffect, useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Platform, Modal, TouchableWithoutFeedback, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeftIcon,
  SparklesIcon,
  Wand2Icon,
  CornerDownRightIcon,
  UserIcon,
  ChevronDownIcon,
  PaletteIcon,
  XIcon,
  PlusIcon,
  CheckIcon
} from "lucide-react-native";
import ColorPicker, { Panel1, Swatches, Preview, HueSlider, OpacitySlider } from 'reanimated-color-picker';

import CoefficientHandler from "../../../../core/CoefficientHandler";
import MarksHandler from "../../../../core/MarksHandler";
import ColorsHandler from "../../../../core/ColorsHandler";
import StorageHandler from "../../../../core/StorageHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import CustomChooser from "../../../components/CustomChooser";

// Helper to lighten hex color
const lightenHex = (col, amt) => {
  var usePound = false;
  if (col[0] == "#") {
    col = col.slice(1);
    usePound = true;
  }
  var num = parseInt(col, 16);
  var r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  var b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  var g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

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

const SettingRow = ({ icon, title, rightElement, subtitle }) => {
  const { theme } = useGlobalAppContext();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 12, paddingHorizontal: 15,
      borderBottomWidth: 1, borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {/* Icon color handled at prop level or defaulted below */}
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 15, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>{title}</Text>
          {subtitle && <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement}
    </View>
  );
};

function CoefficientsPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater, updateGlobalDisplay } = useAppStackContext();
  const { mainAccount } = useCurrentAccountContext();
  const [updateTrigger, setUpdateTrigger] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Custom Color State
  const [customMode, setCustomMode] = useState(false);
  const [tempColor, setTempColor] = useState('#8B5CF6'); // Default purple

  useEffect(() => {
    // Force re-render on global updates
    loadSubjects();

    // Listen for color changes (fixes "not the correct color" issue if ColorsHandler updates late)
    const update = () => forceUpdate();
    ColorsHandler.addListener(update);
    return () => ColorsHandler.removeListener(update);
  }, [globalDisplayUpdater, mainAccount]);

  const loadSubjects = async () => {
    try {
      const cacheData = await StorageHandler.getData("marks");
      const accountData = cacheData?.[mainAccount.id]?.data;

      if (!accountData) return;

      // Collect all unique subjects from all periods
      const subjectSet = new Set();
      const subList = [];

      Object.values(accountData).forEach(period => {
        Object.values(period.subjects).forEach(subject => {
          // Use Name as the primary display, but request with ID too
          const name = subject.title || subject.name;
          // Use ID for lookup if available
          const id = subject.id || name;

          // Avoid duplicates based on Name
          if (!subjectSet.has(name)) {
            subjectSet.add(name);
            subList.push({ id, name });
          }
        });
      });

      setSubjects(subList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
    }
  };

  const forceUpdate = () => setUpdateTrigger(!updateTrigger);

  const handleColorSelect = (colorPair) => {
    if (selectedSubject) {
      // Pass the subject name as the canonical key source
      ColorsHandler.setSubjectColor(selectedSubject, colorPair[1], colorPair[0], selectedSubject);
      updateGlobalDisplay();
      forceUpdate();
      setModalVisible(false);
    }
  };

  const saveCustomColor = () => {
    try {
      // Generate light variant (add 40 to brightness)
      const lightVariant = lightenHex(tempColor, 40);
      handleColorSelect([tempColor, lightVariant]); // [Dark, Light]
    } catch (e) {
      console.error("Color calc error", e);
      // Fallback
      handleColorSelect([tempColor, tempColor]);
    }
  };

  const onSelectColor = ({ hex }) => {
    setTempColor(hex);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Matières & Couleurs" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}>

          {/* Intro */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: theme.colors.primary,
            borderWidth: 1.5, borderRadius: 16, padding: 20,
            flexDirection: 'row', alignItems: 'center', marginTop: 15,
          }}>
            <SparklesIcon size={26} color={theme.colors.primary} style={{ marginRight: 18 }} />
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginBottom: 5, fontSize: 16 }}>Personnalisation</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 18 }}>
                Gérez les couleurs de vos matières et l'ajustement automatique des coefficients.
              </Text>
            </View>
          </View>

          {/* Accounts Loop (Coefficients part - kept existing) */}
          {(mainAccount.accountType == "E" ? [mainAccount] : Object.values(mainAccount.children ?? [])).map(account => (
            <View key={account.id} style={{ marginTop: 25 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 10, fontFamily: 'Text-Bold', letterSpacing: 1, marginLeft: 5 }}>
                COEFFICIENTS ({account.firstName})
              </Text>

              <View style={{
                backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, overflow: 'hidden',
                borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}>
                <SettingRow
                  icon={<Wand2Icon size={18} color={theme.colors.primary} />}
                  title="Devine coef. notes"
                  rightElement={
                    <Switch
                      value={CoefficientHandler.guessMarkCoefficientEnabled[account.id]}
                      trackColor={{ false: "#334155", true: theme.colors.primary }}
                      thumbColor={"#FFF"}
                      onValueChange={async (value) => {
                        await CoefficientHandler.setGuessMarkCoefficientEnabled(account.id, value);
                        await MarksHandler.recalculateAverageHistory(account.id);
                        updateGlobalDisplay();
                        forceUpdate();
                      }}
                    />
                  }
                />
                <SettingRow
                  icon={<Wand2Icon size={18} color={theme.colors.primary} />}
                  title="Devine coef. matières"
                  rightElement={
                    <Switch
                      value={CoefficientHandler.guessSubjectCoefficientEnabled[account.id]}
                      trackColor={{ false: "#334155", true: theme.colors.primary }}
                      thumbColor={"#FFF"}
                      onValueChange={async (value) => {
                        await CoefficientHandler.setGuessSubjectCoefficientEnabled(account.id, value);
                        await MarksHandler.recalculateAverageHistory(account.id);
                        updateGlobalDisplay();
                        forceUpdate();
                      }}
                    />
                  }
                />

                {/* School Level Picker Logic from original file */}
                {CoefficientHandler.guessSubjectCoefficientEnabled[account.id] && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 12, paddingHorizontal: 15, paddingLeft: 40,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CornerDownRightIcon size={16} color="#94A3B8" style={{ marginRight: 10 }} />
                      <Text style={{ color: '#E2E8F0', fontWeight: '600' }}>Niveau Scolaire</Text>
                    </View>

                    <CustomChooser
                      defaultItem={(
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: theme.colors.primary, marginRight: 5, fontWeight: 'bold' }}>
                            {CoefficientHandler.choosenProfiles[account.id] ?? "Choisir..."}
                          </Text>
                          <ChevronDownIcon size={16} color={theme.colors.primary} />
                        </View>
                      )}
                      selected={CoefficientHandler.choosenProfiles[account.id]}
                      setSelected={async (profile) => {
                        await CoefficientHandler.setChoosenProfile(account.id, profile);
                        await MarksHandler.recalculateAverageHistory(account.id);
                        updateGlobalDisplay();
                        forceUpdate();
                      }}
                      items={Object.keys(CoefficientHandler.profiles).map(key => ({ id: key, title: key }))}
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* NEW SECTION: COLORS */}
          <View style={{ marginTop: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Text-Bold', letterSpacing: 1, marginLeft: 5 }}>
                COULEURS DES MATIÈRES
              </Text>
              <TouchableOpacity
                onPress={() => {
                  ColorsHandler.resetSubjectColors();
                  // Re-register each subject to apply new defaults
                  subjects.forEach(s => ColorsHandler.registerSubjectColor(s.id, s.name));
                  loadSubjects();
                  updateGlobalDisplay();
                }}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
              >
                <Text style={{ color: '#94A3B8', fontSize: 10, fontFamily: 'Text-Bold' }}>RÉINITIALISER</Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF', borderRadius: 16, overflow: 'hidden',
              borderWidth: 1, borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}>
              {subjects.map((subjectObj, index) => {
                const name = subjectObj.name;
                const id = subjectObj.id;

                // Pass both ID and Name to ensure migration works if ID matches legacy data
                const colors = ColorsHandler.getSubjectColors(id, name);
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedSubject(name);
                      setCustomMode(false); // Reset to preset mode
                      setModalVisible(true);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: 12, paddingHorizontal: 15,
                      borderBottomWidth: index === subjects.length - 1 ? 0 : 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 20,
                        backgroundColor: colors.dark,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 15, borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.1)'
                      }} />
                      <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 15, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>{name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#64748B', fontSize: 12, marginRight: 8 }}>Modifier</Text>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.dark }} />
                    </View>
                  </TouchableOpacity>
                )
              })}

              {subjects.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B' }}>Aucune matière trouvée sur ce compte.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 25, opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'justify', lineHeight: 20 }}>
              <Text style={{ fontWeight: 'bold', color: '#CBD5E1' }}>À quoi servent les coefficients ?</Text>{"\n"}
              Certains établissements ne partagent pas les coefficients via ÉcoleDirecte, ce qui fausse vos moyennes. NotiaNote utilise des algorithmes pour les "deviner" en fonction des noms des notes (ex: un DST compte plus qu'un DM) et des matières selon votre niveau.{"\n"}{"\n"}
              C'est une fonctionnalité fiable qui garantit une moyenne au plus proche de la réalité.
            </Text>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>

        {/* Color Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </TouchableWithoutFeedback>

            <View style={{ backgroundColor: theme.dark ? '#1E293B' : '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 50 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {customMode && (
                    <TouchableOpacity onPress={() => setCustomMode(false)} style={{ marginRight: 10 }}>
                      <ChevronLeftIcon size={24} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 18, fontWeight: 'bold' }}>{customMode ? "Couleur personnalisée" : "Choisir une couleur"}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 5, borderRadius: 20 }}>
                  <XIcon size={20} color={theme.dark ? "#FFF" : theme.colors.onBackground} />
                </TouchableOpacity>
              </View>

              {!customMode ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', opacity: 1 }}>
                  {(ColorsHandler.defaultColors || []).map((pair, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleColorSelect(pair)}
                      style={{
                        width: '18%', aspectRatio: 1, marginBottom: 15, marginRight: '2%',
                        borderRadius: 99, backgroundColor: pair[0],
                        borderWidth: 2, borderColor: '#FFF',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    />
                  ))}

                  {/* Add Custom Button */}
                  <TouchableOpacity
                    onPress={() => setCustomMode(true)}
                    style={{
                      width: '18%', aspectRatio: 1, marginBottom: 15, marginRight: '2%',
                      borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 2, borderColor: '#FFF',
                      alignItems: 'center', justifyContent: 'center',
                      borderStyle: 'dashed'
                    }}
                  >
                    <PlusIcon size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <ColorPicker
                    style={{ width: '100%', alignItems: 'center' }}
                    value={tempColor}
                    onComplete={onSelectColor}
                  >
                    <Preview hideInitialColor style={{ height: 40, width: '100%', borderRadius: 10, marginBottom: 20 }} />
                    <Panel1 style={{ height: 150, width: '100%', borderRadius: 15, marginBottom: 20 }} />
                    <HueSlider style={{ height: 30, width: '100%', borderRadius: 15, marginBottom: 20 }} />
                    <OpacitySlider style={{ height: 30, width: '100%', borderRadius: 15, marginBottom: 20 }} />
                  </ColorPicker>

                  <TouchableOpacity
                    onPress={saveCustomColor}
                    style={{
                      backgroundColor: theme.colors.primary, paddingVertical: 15,
                      borderRadius: 15, alignItems: 'center', marginTop: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <CheckIcon size={20} color={theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF'} style={{ marginRight: 10 }} />
                      <Text style={{ color: theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF', fontWeight: 'bold', fontSize: 16 }}>Appliquer</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 15 }}>
                Modification pour : {selectedSubject}
              </Text>
            </View>
          </View>
        </Modal>

      </LinearGradient>
    </View>
  );
}

export default memo(CoefficientsPage);