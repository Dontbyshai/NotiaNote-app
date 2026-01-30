import { useEffect, useRef } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Platform } from "react-native";
import { BarChart3Icon, MessageSquareIcon, ChevronDownIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";
import useState from "react-usestateref";

import { useGlobalAppContext } from "../../../../util/GlobalAppContext";
import { useCurrentAccountContext } from "../../../../util/CurrentAccountContext";
import { formatAverage } from "../../../../util/Utils";
import AccountHandler from "../../../../core/AccountHandler";
import EvolutionChartModal from "./EvolutionChartModal";
import AdsHandler from "../../../../core/AdsHandler";


function MarksOverview({
  selectedPeriod, setSelectedPeriod,
  latestCurrentPeriod, setLatestCurrentPeriod,
  periods,
  navigation,
  showAppreciations,
  setShowAppreciations,
}) {
  const { theme } = useGlobalAppContext();
  const { accountID } = useCurrentAccountContext();
  const [chartVisible, setChartVisible] = useState(false);
  const [showEvolutionArrows, setShowEvolutionArrows] = useState(true);

  useEffect(() => {
    AccountHandler.getPreference("ui_show_evolution_arrows", true).then(setShowEvolutionArrows);
  }, [accountID]);

  // Auto-select latest period
  useEffect(() => {
    const handleAutoSelect = async () => {
      const isAuto = await AccountHandler.getPreference("logic_auto_trimestre", true);
      if (!isAuto && selectedPeriod) return; // Don't auto-switch if not auto and already have a selection

      if (Object.keys(periods).length && !selectedPeriod) {
        let shownPeriod = null;
        let periodValues = Object.values(periods);
        for (let i = 0; i < periodValues.length; i++) {
          // Prioritize unfinished periods that also have data (marks)
          if (!periodValues[i].isFinished && Object.keys(periodValues[i].marks || {}).length > 0) {
            shownPeriod = i;
            break;
          }
        }
        // If no current period with data, find the last period that HAS data
        if (shownPeriod == null) {
          for (let i = periodValues.length - 1; i >= 0; i--) {
            if (Object.keys(periodValues[i].marks || {}).length > 0) {
              shownPeriod = i;
              break;
            }
          }
        }
        // If absolutely no period has data, default to last
        if (shownPeriod == null) shownPeriod = periodValues.length - 1;

        let newSelectedPeriod = Object.keys(periods)[shownPeriod];
        setSelectedPeriod(newSelectedPeriod);
        setLatestCurrentPeriod(newSelectedPeriod);
      }
    };
    handleAutoSelect();
  }, [periods, selectedPeriod]);

  if (!selectedPeriod || !periods[selectedPeriod]) return null;

  const currentData = periods[selectedPeriod];

  const hasAppreciations =
    (currentData.appreciationPP && currentData.appreciationPP.length > 0) ||
    (currentData.appreciationCE && currentData.appreciationCE.length > 0) ||
    Object.values(currentData.subjects).some(
      subject => subject.appreciations && subject.appreciations.length > 0
    );

  // Evolution Arrow Logic
  function getEvolutionData() {
    if (!showEvolutionArrows || !currentData.averageHistory || currentData.averageHistory.length < 2) return null;
    const history = currentData.averageHistory;
    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;

    if (current > previous) return { icon: "↑", color: "#4ADE80" }; // Green
    if (current < previous) return { icon: "↓", color: "#F87171" }; // Red
    return null;
  }
  const evolution = getEvolutionData();

  return (
    <View style={{ marginHorizontal: 20 }}>
      {/* 1. Period Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 15 }}
      >
        {Object.values(periods).filter(p => Object.keys(p.marks || {}).length > 0).map((period) => {
          const isSelected = selectedPeriod === period.id;
          return (
            <TouchableOpacity
              key={period.id}
              onPress={() => setSelectedPeriod(period.id)}
              style={{
                backgroundColor: isSelected ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                marginRight: 10,
                borderWidth: 1,
                borderColor: isSelected ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
              }}
            >
              <Text style={{
                color: isSelected ? (theme.colors.primary === '#FAFAFA' ? '#000' : '#FFF') : '#94A3B8',
                fontFamily: 'Text-Bold',
                fontSize: 14
              }}>
                {period.title}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* 2. Average Cards */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        {/* General Average */}
        <View style={{
          flex: 1,
          backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          marginRight: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          shadowColor: "#000",
          shadowOpacity: theme.dark ? 0 : 0.05,
          shadowRadius: 10,
          elevation: Platform.OS === 'android' ? 0 : 2
        }}>
          <Text style={{ color: theme.colors.onSurfaceDisabled || '#94A3B8', fontSize: 11, fontFamily: 'Text-Medium', marginBottom: 5 }}>Moyenne Générale</Text>
          <Text style={{ color: theme.colors.onSurface || '#FFF', fontSize: 28, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
            {formatAverage(currentData.average)}
            {evolution && (
              <Text style={{ fontSize: 20, color: evolution.color }}>
                {" "}{evolution.icon}
              </Text>
            )}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceDisabled || '#64748B', fontSize: 12 }}>/20</Text>
        </View>

        {/* Class Average */}
        <View style={{
          flex: 1,
          backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          marginRight: 10,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          shadowColor: "#000",
          shadowOpacity: theme.dark ? 0 : 0.05,
          shadowRadius: 10,
          elevation: Platform.OS === 'android' ? 0 : 2
        }}>
          <Text style={{ color: theme.colors.onSurfaceDisabled || '#94A3B8', fontSize: 11, fontFamily: 'Text-Medium', marginBottom: 5 }}>Moyenne Classe</Text>
          <Text style={{ color: theme.colors.onSurface || '#FFF', fontSize: 28, fontFamily: 'Text-Bold', fontWeight: 'bold' }}>
            {formatAverage(currentData.classAverage)}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceDisabled || '#64748B', fontSize: 12 }}>/20</Text>
        </View>
      </View>

      {/* 3. Action Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <PressableScale
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            paddingVertical: 12,
            borderRadius: 25,
            marginRight: 8,
          }}
          onPress={() => AdsHandler.showRewardedAd(() => setChartVisible(true), null, 'graph')}
        >
          <BarChart3Icon size={18} color={theme.dark ? "#FFF" : theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.dark ? '#FFF' : theme.colors.primary, fontSize: 13, fontFamily: 'Text-Medium' }}>Voir les graphiques</Text>
        </PressableScale>

        {hasAppreciations && (
          <PressableScale
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showAppreciations ? theme.colors.primary : (theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
              paddingVertical: 12,
              borderRadius: 25,
              marginLeft: 8,
            }}
            onPress={() => {
              if (!showAppreciations) {
                AdsHandler.showRewardedAd(() => setShowAppreciations(true), null, 'appreciation');
              } else {
                setShowAppreciations(false);
              }
            }}
          >
            <MessageSquareIcon size={18} color={showAppreciations ? "#FFF" : (theme.dark ? "#FFF" : theme.colors.primary)} style={{ marginRight: 8 }} />
            <Text style={{ color: showAppreciations ? '#FFF' : (theme.dark ? '#FFF' : theme.colors.primary), fontSize: 13, fontFamily: 'Text-Medium' }}>
              {showAppreciations ? "Voir les notes" : "Voir les appréciations"}
            </Text>
          </PressableScale>
        )}
      </View>

      <EvolutionChartModal
        visible={chartVisible}
        onClose={() => setChartVisible(false)}
        data={currentData.averageHistory}
      />

    </View>
  );
}

export default MarksOverview;