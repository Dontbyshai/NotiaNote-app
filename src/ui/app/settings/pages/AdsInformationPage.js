import { memo, useState } from "react";
import { View, Text, Platform, Dimensions, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeftIcon, MegaphoneIcon } from "lucide-react-native";

import CustomAnimatedChangeableItem from "../../../components/CustomAnimatedChangeableItem";
import AdsHandler from "../../../../core/AdsHandler";
import { useGlobalAppContext } from "../../../../util/GlobalAppContext";

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

function AdsInformationPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const [needToRestartApp, setNeedToRestartApp] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Platform.isPad ? 0 : Dimensions.get('window').width);
  const onLayout = (e) => setWindowWidth(e.nativeEvent.layout.width);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={onLayout}>
      <LinearGradient
        colors={[theme.colors.primaryLight, theme.colors.background]}
        style={{ flex: 1 }}
      >
        <GalaxyHeader title="Publicité" onBack={() => navigation.pop()} theme={theme} />

        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
          {/* Icon Replacement for Lottie */}
          <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 30 }}>
            <View style={{
              width: 120, height: 120, borderRadius: 60,
              backgroundColor: theme.colors.primary + '1A', // Tint
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.colors.primary,
              shadowColor: theme.colors.primary, shadowRadius: 20, shadowOpacity: 0.3
            }}>
              <MegaphoneIcon size={60} color={theme.colors.primary} />
            </View>
            <Text style={{
              color: theme.dark ? '#FFF' : theme.colors.onBackground, fontSize: 22, fontFamily: 'Text-Bold',
              textAlign: 'center', width: '90%', marginTop: 20
            }}>
              Pourquoi les publicités ?
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <View style={{
              backgroundColor: theme.dark ? 'rgba(15, 23, 42, 0.4)' : '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              shadowColor: "#000", shadowOpacity: theme.dark ? 0 : 0.05, shadowRadius: 10, elevation: 2
            }}>
              <Text style={{ color: theme.dark ? '#E2E8F0' : '#475569', fontSize: 15, fontFamily: 'Text-Medium', textAlign: 'justify', marginBottom: 15 }}>
                Les publicités permettent le financement du développement de l'app, afin qu'elle soit mise à jour régulièrement et que les bugs soient réglés au plus vite.
              </Text>
              <Text style={{ color: theme.dark ? '#E2E8F0' : '#475569', fontSize: 15, fontFamily: 'Text-Medium', textAlign: 'justify', marginBottom: 20 }}>
                Vous pouvez changer à tout moment vos préférences de personnalisation des publicités.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  AdsHandler.resetAdChoices();
                  setNeedToRestartApp(true);
                }}
                style={{
                  backgroundColor: theme.colors.primary + '33', // Purple tint
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <CustomAnimatedChangeableItem
                  animationTime={100}
                  updaters={[needToRestartApp]}
                  item={needToRestartApp ? (
                    <View>
                      <Text style={{ color: theme.dark ? '#FFF' : theme.colors.primary, fontWeight: 'bold' }}>Redémarrez l'app</Text>
                      <Text style={{ color: theme.dark ? theme.colors.primaryLight : '#64748B', fontSize: 12 }}>pour choisir à nouveau</Text>
                    </View>
                  ) : (
                    <Text style={{ color: theme.dark ? '#FFF' : theme.colors.primary, fontWeight: 'bold' }}>Changer de choix</Text>
                  )}
                />
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

export default memo(AdsInformationPage);