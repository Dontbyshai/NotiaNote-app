import { View, Text, Image, Dimensions, Linking } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from 'react-native-pressable-scale';

import CustomButton from '../components/CustomButton';
import { openLink } from "../../util/Utils";
import { useGlobalAppContext } from '../../util/GlobalAppContext';

// Main start page
function StartPage({ navigation }) {
  const { theme } = useGlobalAppContext();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#1a1a2e", "#16213e", "#0f3460"]} // Deep galaxy colors
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>

        {/* Top Spacer / Gradient decoration could go here */}
        <View style={{ flex: 1 }} />

        {/* Center Content */}
        <View style={{ alignItems: 'center', width: '100%' }}>
          {/* Logo */}
          <Image
            source={require('../../../assets/icon.png')}
            style={{ width: 120, height: 120, marginBottom: 20 }}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={{
            fontSize: 42,
            fontWeight: 'bold',
            color: '#ffffff',
            fontFamily: theme.fonts.titleLarge.fontFamily
          }}>
            NotiaNote
          </Text>

          {/* Slogan */}
          <Text style={{
            fontSize: 16,
            color: '#a0a0a0',
            marginTop: 5,
            marginBottom: 30,
            fontFamily: theme.fonts.labelLarge.fontFamily
          }}>
            Votre scolarité, réinventée.
          </Text>

          {/* Tags */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 50 }}>
            {["Notes", "Devoirs", "Agenda"].map((tag) => (
              <View key={tag} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)'
              }}>
                <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: theme.fonts.labelMedium.fontFamily }}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Start Button */}
          <PressableScale
            onPress={() => navigation.navigate("LoginPage")}
            style={{
              backgroundColor: '#ffffff',
              paddingVertical: 16,
              paddingHorizontal: 60,
              borderRadius: 30,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 8,
            }}
          >
            <Text style={{ color: '#000000', fontSize: 18, fontWeight: 'bold', fontFamily: theme.fonts.titleMedium.fontFamily }}>
              Commencer
            </Text>
          </PressableScale>
        </View>

        {/* Footer Content */}
        <View style={{ marginBottom: 20, flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <PressableScale onPress={() => openLink("https://notianote.com/privacy")}>
              <Text style={{ color: '#888888', fontSize: 10, fontFamily: theme.fonts.labelSmall.fontFamily }}>Confidentialité</Text>
            </PressableScale>
            <Text style={{ color: '#888888', fontSize: 10 }}>·</Text>
            <PressableScale onPress={() => openLink("https://github.com/notianote")}>
              <Text style={{ color: '#888888', fontSize: 10, fontFamily: theme.fonts.labelSmall.fontFamily }}>GitHub</Text>
            </PressableScale>
            <Text style={{ color: '#888888', fontSize: 10 }}>·</Text>
            <PressableScale onPress={() => openLink("mailto:contact@notianote.com")}>
              <Text style={{ color: '#888888', fontSize: 10, fontFamily: theme.fonts.labelSmall.fontFamily }}>Contact</Text>
            </PressableScale>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

export default StartPage;