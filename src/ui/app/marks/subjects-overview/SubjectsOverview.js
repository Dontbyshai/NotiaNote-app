import { useEffect, useState } from "react";
import { Dimensions, Text, View } from "react-native";
import { PressableScale } from "react-native-pressable-scale";

import SubjectCard from "./SubjectCard";
import AccountHandler from "../../../../core/AccountHandler";
import HomeworkHandler from "../../../../core/HomeworkHandler";
import { formatAverage } from "../../../../util/Utils";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useAppStackContext } from "../../../../util/AppStackContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";


// Subjects overview
function SubjectsOverview({
  selectedPeriod,
  latestCurrentPeriod,
  periods,
  navigation,
  onAddMark,
  showAppreciations,
}) {
  const { theme } = useGlobalAppContext();
  const { globalDisplayUpdater } = useAppStackContext();
  const { accountID, gotHomework } = useCurrentAccountContext();

  // Get if subject has exam
  const [subjectHasExam, setSubjectHasExam] = useState({});
  const [countMarksWithOnlyCompetences, setCountMarksWithOnlyCompetences] = useState(false);
  useEffect(() => {
    HomeworkHandler.getSubjectHasExam(accountID).then(setSubjectHasExam);
    AccountHandler.getPreference("countMarksWithOnlyCompetences").then(setCountMarksWithOnlyCompetences);
    AccountHandler.getPreference("ui_show_evolution_arrows", true).then(setShowEvolutionArrows);
  }, [accountID, gotHomework, globalDisplayUpdater]);

  const [showEvolutionArrows, setShowEvolutionArrows] = useState(true);

  return (
    <View>
      {/* General Appreciations */}
      {showAppreciations && (
        <View style={{ marginHorizontal: 20, marginBottom: 15 }}>
          {periods[selectedPeriod].appreciationPP ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, marginBottom: 10 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Text-Bold', marginBottom: 5 }}>PROFESSEUR PRINCIPAL</Text>
              <Text style={{ color: '#FFF', fontSize: 14 }}>{periods[selectedPeriod].appreciationPP}</Text>
            </View>
          ) : null}
          {periods[selectedPeriod].appreciationCE ? (
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Text-Bold', marginBottom: 5 }}>CHEF D'ÉTABLISSEMENT</Text>
              <Text style={{ color: '#FFF', fontSize: 14 }}>{periods[selectedPeriod].appreciationCE}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Subject groups */}
      {periods[selectedPeriod]?.sortedSubjectGroups?.map(subjectGroupID => {
        const subjectGroup = periods[selectedPeriod].subjectGroups[subjectGroupID];
        return (
          <View key={subjectGroup.id} style={{ marginVertical: 10, marginHorizontal: 20 }}>
            {/* Header Text */}
            <Text style={{
              color: '#94A3B8',
              fontSize: 12,
              fontFamily: 'Text-Bold',
              textTransform: 'uppercase',
              marginBottom: 10,
              marginTop: 10,
              letterSpacing: 1
            }}>
              {subjectGroup.title}
            </Text>



            {subjectGroup.subjects.map(subjectID => {
              const subject = periods[selectedPeriod].subjects[subjectID];
              if (!subject) return null;
              return <SubjectCard
                key={subjectID}
                subject={subject}
                getMark={(markID) => periods[selectedPeriod].marks[markID]}
                hasExam={selectedPeriod == latestCurrentPeriod ? subjectHasExam[subjectID] : undefined}
                countMarksWithOnlyCompetences={countMarksWithOnlyCompetences}
                navigation={navigation}
                onAddMark={onAddMark}
                showAppreciations={showAppreciations}
                showEvolutionArrows={showEvolutionArrows}
              />;
            })}
          </View>
        )
      })}

      {/* Other subjects */}
      <View style={{ marginTop: 15, marginBottom: 20, marginHorizontal: 20 }}>
        {Object.keys(periods[selectedPeriod]?.subjectGroups ?? {}).length > 0 && periods[selectedPeriod]?.subjectsNotInSubjectGroup.length > 0 && (
          <View style={{ position: 'absolute', height: '100%' }}>
            <Text style={[theme.fonts.labelLarge, { fontFamily: 'Text-Medium' }]}>AUTRES MATIÈRES</Text>
          </View>
        )}

        <View style={{
          marginTop: Object.keys(periods[selectedPeriod]?.subjectGroups ?? {}).length > 0 ? 25 : 0,
        }}>
          {Object.values(periods[selectedPeriod]?.subjectsNotInSubjectGroup ?? {}).map(subjectID => {
            const subject = periods[selectedPeriod].subjects[subjectID];
            if (!subject) return null;
            return <SubjectCard
              key={subjectID}
              subject={subject}
              getMark={(markID) => periods[selectedPeriod].marks[markID]}
              hasExam={selectedPeriod == latestCurrentPeriod ? subjectHasExam[subjectID] : undefined}
              countMarksWithOnlyCompetences={countMarksWithOnlyCompetences}
              navigation={navigation}
              onAddMark={onAddMark}
              showAppreciations={showAppreciations}
              showEvolutionArrows={showEvolutionArrows}
            />;
          })}
        </View>
      </View>
    </View>
  );
}

export default SubjectsOverview;