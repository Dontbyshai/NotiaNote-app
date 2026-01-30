import { Dimensions, FlatList, Text, View, TouchableOpacity, Platform } from "react-native";
import { PlusIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";

import ColorsHandler from "../../../../core/ColorsHandler";
import { formatAverage } from "../../../../util/Utils";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";


// Embedded subject card
function EmbeddedSubjectCard({
  subject,
  getMark,
  hasExam,
  countMarksWithOnlyCompetences,
  navigation,
  onAddMark,
  showAppreciations,
  showEvolutionArrows,
}) {
  const { theme } = useGlobalAppContext();
  // Pass title as second arg to ensure correct canonical key generation (e.g. "ColorsHandler.getSubjectColors(id, name)")
  // Use subject.title as the name if available.
  const { dark } = ColorsHandler.getSubjectColors(subject.id, subject.title || subject.id);
  const accentColor = dark || theme.colors.primary;

  // Open subject page
  function openSubjectPage() {
    // Navigate to Subject Details (assuming MarksTab handles "SubjectStack" or "Subject" route)
    // The previous code used navigation.navigate("SubjectStack", { cacheSubject: subject }).
    // We keep this behavior.
    navigation.navigate("SubjectStack", {
      cacheSubject: subject,
    });
  }

  // Color Logic Helper
  function getDiffColor(val, classAvg) {
    if (val === undefined || classAvg === undefined) {
      // Fallback if no class average available
      if (val === undefined) return '#94A3B8'; // Grey
      return val >= 10 ? '#4ADE80' : '#F87171';
    }
    const diff = val - classAvg;
    if (diff > 1.5) return '#4ADE80'; // Green (Above +1.5)
    if (diff < -1.5) return '#F87171'; // Red (Below -1.5)
    return '#60A5FA'; // Blue (Within +/- 1.5)
  }

  const averageColor = getDiffColor(subject.average, subject.classAverage);

  // Evolution Arrow Logic
  function getEvolutionData() {
    if (!showEvolutionArrows || !subject.averageHistory || subject.averageHistory.length < 2) return null;
    const history = subject.averageHistory;
    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;

    if (current > previous) return { icon: "↑", color: "#4ADE80" }; // Green
    if (current < previous) return { icon: "↓", color: "#F87171" }; // Red
    return null;
  }
  const evolution = getEvolutionData();

  // Parse appreciations
  const appreciationText = (subject.appreciations || []).map(a => {
    // Already decoded in MarksHandler
    // Wait, MarksHandler stored decoded strings?
    // Let's check MarksHandler again. Yes: .map(parseHtmlData).
    return a;
  }).join("\n\n");

  const showAppreciationView = showAppreciations && appreciationText && appreciationText.length > 0;

  return (
    <PressableScale
      onPress={openSubjectPage}
      style={{
        backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        minHeight: 100,
        flexDirection: 'row',
        overflow: 'visible', // Visible for Shadow
        borderWidth: 1,
        borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0 : 0.05,
        shadowRadius: 4,
        elevation: Platform.OS === 'android' ? 0 : 2
      }}
    >
      {/* Left Color Strip */}
      <View style={{ width: 6, backgroundColor: accentColor, height: '100%', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }} />

      <View style={{ flex: 1, padding: 15 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ color: theme.colors.onSurface, fontFamily: 'Text-Bold', fontSize: 16, textTransform: 'uppercase', lineHeight: 22 }}>
              {subject.title}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceDisabled || '#94A3B8', fontSize: 12, fontFamily: 'Text-Medium', marginTop: 2 }}>
              Coef: {subject.coef || 1}
            </Text>
          </View>

          {/* Averages (Right) -- Hide if showing appreciations */}
          {!showAppreciationView && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{
                color: averageColor,
                fontSize: 20, fontFamily: 'Text-Bold', fontWeight: 'bold'
              }}>
                {subject.average ? formatAverage(subject.average) : 'N/A'}
                <Text style={{ fontSize: 13, fontWeight: 'normal', color: averageColor }}>/20</Text>
                {evolution && (
                  <Text style={{ fontSize: 16, color: evolution.color, marginLeft: 2 }}>
                    {" "}{evolution.icon}
                  </Text>
                )}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 11 }}>
                Classe: {subject.classAverage ? formatAverage(subject.classAverage) : 'N/A'}
              </Text>
            </View>
          )}
        </View>

        {/* Content Row (Marks OR Appreciation) */}
        {showAppreciationView ? (
          <View style={{ marginTop: 15 }}>
            <Text style={{ color: theme.colors.onSurface || '#E2E8F0', fontSize: 14, fontFamily: 'Text-Regular', lineHeight: 20, fontStyle: 'italic' }}>
              "{appreciationText}"
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 15, alignItems: 'center' }}>
            {subject.sortedMarks?.length > 0 ? (
              subject.sortedMarks.map((item) => {
                const mark = getMark(item);
                if (!mark) return null;
                const val = mark.value;

                const markColor = !mark.isEffective ? '#64748B' : getDiffColor(val, subject.classAverage);
                const bgColor = markColor + '33'; // 20% opacity

                return (
                  <View key={item} style={{
                    backgroundColor: bgColor,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8, // Add margin bottom for wrapping
                    borderWidth: 1,
                    borderColor: markColor + '60',
                  }}>
                    <Text style={{ color: markColor, fontSize: 13, fontWeight: 'bold' }}>
                      {!mark.isEffective && mark.valueStr ? '(' : ''}
                      {formatAverage(val)}
                      {!mark.isEffective && mark.valueStr ? ')' : ''}
                      <Text style={{ fontSize: 10 }}>/{mark.scale || 20}</Text>
                    </Text>
                  </View>
                )
              })
            ) : (
              <Text style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', marginBottom: 8, flex: 1 }}>
                Aucune note
              </Text>
            )}

            {/* Add Simulation Button (+) */}
            <TouchableOpacity
              onPress={() => onAddMark && onAddMark(subject)}
              style={{
                width: 35, height: 30,
                backgroundColor: theme.colors.primary + '33', // 20% opacity approx
                borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: theme.colors.primary + '66',
                borderStyle: 'dashed',
                marginBottom: 8,
                marginLeft: 0 // No Left Margin needed if we use gap or right margin on others. Actually others have marginRight.
              }}
            >
              <PlusIcon size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

    </PressableScale>
  );
}

// Main subject card container
function SubjectCard({
  subject,
  getMark,
  hasExam,
  countMarksWithOnlyCompetences,
  navigation,
  onAddMark,
  showAppreciations,
  showEvolutionArrows,
}) {
  return (
    <View style={{ marginTop: 0 }}>
      {/* Sub-subjects logic remains similar if needed, or recursive */}
      <EmbeddedSubjectCard
        subject={subject}
        getMark={getMark}
        hasExam={hasExam}
        countMarksWithOnlyCompetences={countMarksWithOnlyCompetences}
        navigation={navigation}
        onAddMark={onAddMark}
        showAppreciations={showAppreciations}
        showEvolutionArrows={showEvolutionArrows}
      />
      {/* Sub subjects */}
      {Object.values(subject.subSubjects || {}).map((subSubject, index) => (
        <EmbeddedSubjectCard
          key={index}
          subject={subSubject}
          getMark={getMark}
          countMarksWithOnlyCompetences={countMarksWithOnlyCompetences}
          navigation={navigation}
          onAddMark={onAddMark}
          showAppreciations={showAppreciations}
          showEvolutionArrows={showEvolutionArrows}
        />
      ))}
    </View>
  );
}

export default SubjectCard;