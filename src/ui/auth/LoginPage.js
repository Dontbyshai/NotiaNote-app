import { useState, useRef } from "react";
import { View, Text, ActivityIndicator, Dimensions, Platform, KeyboardAvoidingView, Alert } from "react-native";
import { AlertTriangleIcon, CircleUserRoundIcon, HelpCircleIcon, KeySquareIcon } from "lucide-react-native";

import CustomModal from "../components/CustomModal";
import CustomTextInput from "../components/CustomTextInput";
import CustomButton from "../components/CustomButton";
import CustomInformationCard from "../components/CustomInformationCard";
import { useGlobalAppContext } from "../../util/GlobalAppContext";
import { openLink } from "../../util/Utils";
import AccountHandler from "../../core/AccountHandler";
import HapticsHandler from "../../core/HapticsHandler";
import CustomDynamicLoginChooser from "./CustomDynamicLoginChooser";


// Login page
function LoginPage({ navigation }) {
  // Show AppStack once logged-in
  const { theme, isLoggedIn, setIsLoggedIn } = useGlobalAppContext();
  if (isLoggedIn) { navigation.pop(); }

  // Username and password
  const [username, setUsername] = useState('');
  const usernameTextController = useRef(null);
  const [password, setPassword] = useState('');
  const passwordTextController = useRef(null);

  // Page state
  const [isConnecting, setIsConnecting] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [errorConnecting, setErrorConnecting] = useState(false);
  const [debugLog, setDebugLog] = useState("");

  // Login function
  async function login() {
    HapticsHandler.vibrate("light");
    setIsConnecting(true);
    setWrongPassword(false);
    setErrorConnecting(false);
    setDebugLog("");

    // Call login function
    const status = await AccountHandler.login(username, password);
    setDebugLog(`Status Code: ${status}`);

    setIsConnecting(false);
    if (status == 1) { // Successful
      navigation.pop();
      setIsLoggedIn(true);
    } else if (status == 2) { // Choose account
      navigation.navigate("ChooseAccountPage");
    } else if (status == 3) { // 2FA Required
      // Do nothing, DoubleAuthPopup will open on top
    } else if (status == 0) { // Wrong password
      passwordTextController.current.clear();
      setWrongPassword(true);
    } else { // Error when connecting
      setErrorConnecting(true);
    }
  }

  const [windowWidth, setWindowWidth] = useState(Platform.isPad ? 0 : Dimensions.get('window').width);

  return (
    <CustomModal
      title="Se connecter"
      goBackFunction={() => navigation.pop()}
      onlyShowBackButtonOnAndroid
      setWidth={setWindowWidth}
      children={(
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={{ flex: 1 }}
        >
          <View>
            <Text style={[theme.fonts.labelMedium, { marginBottom: 30 }]}>Vous pouvez vous connecter en tant qu'élève ou en tant que parent.</Text>

            {/* Inputs */}
            <CustomTextInput
              label='Identifiant'
              initialValue={username}
              onChangeText={setUsername}
              icon={<CircleUserRoundIcon size={25} color={theme.colors.onSurfaceDisabled} />}
              style={{ marginBottom: 10 }}
              windowWidth={windowWidth}
              controller={usernameTextController}
            />
            <CustomTextInput
              label={wrongPassword ? "Mot de passe incorrect" : "Mot de passe"}
              labelColor={wrongPassword ? theme.colors.error : null}
              onChangeText={setPassword}
              secureTextEntry={true}
              icon={<KeySquareIcon size={25} color={theme.colors.onSurfaceDisabled} />}
              style={{ marginBottom: 10 }}
              windowWidth={windowWidth}
              controller={passwordTextController}
            />

            {/* Account Recovery */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
              <HelpCircleIcon size={20} color={theme.colors.onSurfaceVariant} style={{ marginRight: 10 }} />
              <Text style={[theme.fonts.bodySmall, { color: theme.colors.onSurfaceVariant }]}>Compte ou mot de passe perdu ? </Text>
              <Text
                style={[theme.fonts.bodySmall, { color: theme.colors.primary, textDecorationLine: 'underline' }]}
                onPress={() => openLink("https://www.ecoledirecte.com/MotDePassePerdu?provenance=Mobile")}
              >Cliquez-ici</Text>
            </View>

            {/* Error Message */}
            {errorConnecting && (
              <CustomInformationCard
                title="Erreur de connexion"
                description="Nous n'avons pas pu vous connecter. Vérifiez votre connexion internet."
                icon={<AlertTriangleIcon size={25} color={theme.colors.error} />}
                type="error"
                style={{ marginBottom: 30 }}
              />
            )}

            {/* Login Button */}
            {isConnecting ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <CustomButton
                text="Connexion"
                onPress={login}
                type="primary"
                disabled={username.length < 3 || password.length < 3}
              />
            )}

            {/* Hidden Debug Overlay */}
            {(debugLog !== "") && (
              <Text
                onPress={() => Alert.alert("Détails Techniques", `Code de retour: ${debugLog}\nSi 0: Mot de passe incorrect.\nSi -1: Erreur réseau.`)}
                style={[theme.fonts.bodySmall, { color: theme.colors.onSurfaceDisabled, textAlign: 'center', marginTop: 30, opacity: 0.5 }]}
              >
                Infos de Debugging
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    />
  );
}

export default LoginPage;