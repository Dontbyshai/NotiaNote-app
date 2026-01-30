import { Platform, Text, View } from "react-native";
import { ChevronRightIcon, Users2Icon, WrenchIcon, XIcon } from "lucide-react-native";
import { PressableScale } from "react-native-pressable-scale";

import CustomTag from "../../../components/CustomTag";
import ColorsHandler from "../../../../core/ColorsHandler";
import { formatDate3, formatMark } from "../../../../util/Utils";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";


// Mark card
function MarkCard({ mark, subjectTitle, openMarkDetails, outline, windowWidth, countMarksWithOnlyCompetences }) {
  if (!mark) { return; }

  const { theme } = useGlobalAppContext();

  // Get subject colors
  const { light, dark } = ColorsHandler.getSubjectColors(mark.subjectID);

  return (
    <PressableScale style={{
      backgroundColor: Platform.select({
        android: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
        ios: theme.dark ? 'transparent' : '#FFFFFF'
      }),
      borderRadius: 16,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      shadowColor: "#000",
      shadowOpacity: 0,
      shadowRadius: 5,
      elevation: 0
    }} onPress={openMarkDetails}>
      {/* Mark value */}
      <View style={{
        backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        minWidth: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: dark,
      }}>
        <Text style={[theme.fonts.headlineMedium, {
          color: !mark.isEffective ? '#64748B' : (theme.dark ? '#FFFFFF' : '#000000'),
          height: 25,
          fontSize: 18,
          fontWeight: 'bold',
          top: Platform.select({ android: -2 }),
        }]}>
          {!mark.isEffective && mark.valueStr ? '(' : ''}
          {mark.valueStr ? mark.valueStr : "--"}
          {!mark.isEffective && mark.valueStr ? ')' : ''}
        </Text>

        <Text style={{
          color: '#64748B',
          fontSize: 10,
          marginTop: -2
        }}>/{mark.valueOn}</Text>
      </View>

      {/* Mark details */}
      <View style={{ flex: 1 }}>
        <Text style={[theme.fonts.bodyMedium, { color: theme.dark ? '#F8FAFC' : theme.colors.onSurface, fontWeight: '600', fontSize: 15 }]} numberOfLines={1}>
          {mark.title || "Devoir"}
        </Text>
        {subjectTitle && <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{subjectTitle}</Text>}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <Text style={{ color: '#94A3B8', fontSize: 11 }}>Coef. {mark.coefficient ?? 1}</Text>
          </View>
          {mark.classValue && (
            <Text style={{ color: '#64748B', fontSize: 11 }}>Moy. {formatMark(mark, true)}</Text>
          )}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: '#64748B', fontSize: 12 }}>{formatDate3(mark.date)}</Text>
      </View>

      {/* Is effective ? */}
      <CustomTag
        title={!mark.isEffective ? "Désactivée" : ""}
        color={!mark.isEffective ? theme.colors.error : null}
      />
    </PressableScale>
  );
}


export default MarkCard;