import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, ScrollView, Modal, Button, Alert, Image, Platform, TextInput, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import Code39Barcode from '../../components/Code39Barcode';
import Code128Barcode from '../../components/Code128Barcode';
import { ChevronLeft, Info, Settings, Camera as CameraIcon, X, Hash, Save, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import AccountHandler from '../../../core/AccountHandler';
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import CustomProfilePhoto from '../../components/CustomProfilePhoto';
import BannerAdComponent from '../../components/Ads/BannerAdComponent';
import CustomTextInput from '../../components/CustomTextInput';
import CustomButton from '../../components/CustomButton';

const { width } = Dimensions.get('window');

export default function CantinePage() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { accountID } = useCurrentAccountContext();
    const { theme } = useGlobalAppContext();

    // Data
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [barcodeNumber, setBarcodeNumber] = useState(null);
    const [moduleEnabled, setModuleEnabled] = useState(false);
    const [manualOverride, setManualOverride] = useState(null);

    // Settings
    const [format, setFormat] = useState('CODE39'); // CODE39 (default), CODE128, QR
    const [showSettings, setShowSettings] = useState(false);

    // Camera
    const [showCamera, setShowCamera] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [tempManualCode, setTempManualCode] = useState('');

    useEffect(() => {
        loadData();
    }, [accountID]);

    const loadData = async () => {
        try {
            setLoading(true);
            const userData = await AccountHandler.getSpecificAccount(accountID) || await AccountHandler.getMainAccount();
            setUser(userData);

            // Load Preferences
            const savedFormat = await AccountHandler.getPreference(`cantine_format_${accountID}`);
            if (savedFormat) setFormat(savedFormat);

            const savedOverride = await AccountHandler.getPreference(`cantine_override_${accountID}`);
            if (savedOverride) setManualOverride(savedOverride);

            // Fetch Module Data
            let foundBadge = null;
            if (userData && userData.modules) {
                const cantineModule = userData.modules.find(m => m.code === "CANTINE_BARCODE");
                if (cantineModule && cantineModule.enable) {
                    setModuleEnabled(true);
                    if (cantineModule.params?.numeroBadge) {
                        foundBadge = cantineModule.params.numeroBadge;
                    }
                }
            }

            // Fallback strategy to find the correct barcode (Search for ALL possible ED identifiers)
            if (!foundBadge) {
                // Priority 1: Official Badge / CodeBarre fields (Most reliable if they exist)
                if (userData.badge && userData.badge !== "0") foundBadge = String(userData.badge);
                else if (userData.codeBarre && userData.codeBarre !== "0") foundBadge = String(userData.codeBarre);

                // Priority 2: numDossier (Often used for canteen)
                else if (userData.numDossier && userData.numDossier !== "0") {
                    foundBadge = String(userData.numDossier);
                }
                // Priority 3: Login ID 
                else if (userData.loginID && userData.loginID !== "undefined" && userData.loginID !== "0") {
                    foundBadge = String(userData.loginID);
                }
                // Priority 4: INE (National identifier)
                else if (userData.ine) {
                    foundBadge = String(userData.ine);
                }
                // Priority 5: UID (Custom unique ID)
                else if (userData.uid) {
                    foundBadge = String(userData.uid);
                }
                // Priority 6: Username
                else if (userData.username) {
                    foundBadge = String(userData.username);
                }
                // Priority 7: Account ID
                else if (accountID) {
                    foundBadge = String(accountID);
                }

                if (foundBadge) setModuleEnabled(true);
            }

            setBarcodeNumber(foundBadge);
            if (foundBadge && !tempManualCode) setTempManualCode(foundBadge);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const saveFormat = async (newFormat) => {
        setFormat(newFormat);
        await AccountHandler.setPreference(`cantine_format_${accountID}`, newFormat);
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);
        setManualOverride(data);

        // Detect format
        let detectedFormat = 'CODE39';
        // Expo Camera types: 
        // ios: org.iso.Code39, org.iso.Code128, etc.
        // android: 32 (Code39), 64 (Code128) - rough check via string inclusion
        if (type.toString().toLowerCase().includes('code128') || type === 64) {
            detectedFormat = 'CODE128';
        } else if (type.toString().toLowerCase().includes('qr') || type === 256) {
            detectedFormat = 'QR';
        }

        if (detectedFormat !== format) {
            setFormat(detectedFormat);
            await AccountHandler.setPreference(`cantine_format_${accountID}`, detectedFormat);
        }

        await AccountHandler.setPreference(`cantine_override_${accountID}`, data);
        Alert.alert("Succès", `Code scanné (${detectedFormat}): ${data}`);
        setShowCamera(false);
    };

    const resetManualCode = async () => {
        Alert.alert(
            "Réinitialiser le code ?",
            "Voulez-vous vraiment revenir au code officiel ?",
            [
                {
                    text: "Annuler",
                    style: "cancel"
                },
                {
                    text: "Oui, réinitialiser",
                    style: "destructive",
                    onPress: async () => {
                        setManualOverride(null);
                        setTempManualCode('');
                        await AccountHandler.setPreference(`cantine_override_${accountID}`, null);
                        Alert.alert("Réinitialisé", "Retour au code officiel.");
                    }
                }
            ]
        );
    };

    const handleSaveManual = async () => {
        if (!tempManualCode || tempManualCode.trim().length === 0) {
            Alert.alert("Erreur", "Veuillez entrer un numéro de badge.");
            return;
        }
        const val = tempManualCode.trim();
        setManualOverride(val);
        await AccountHandler.setPreference(`cantine_override_${accountID}`, val);
        Alert.alert("Enregistré", `Le code ${val} a été sauvegardé.`);
        setShowSettings(false);
    };

    const activeCode = manualOverride || barcodeNumber;

    const [downloadingPass, setDownloadingPass] = useState(false);

    const generateAppleWalletPass = async () => {
        if (!activeCode) {
            Alert.alert("Erreur", "Aucun code barre à ajouter à la carte.");
            return;
        }

        try {
            setDownloadingPass(true);

            // Your Node.js backend URL (localhost for simulator)
            // If you test on a real device on same WiFi, use your computer's local IP (e.g., http://192.168.1.X:3000)
            // Map the app's format state to the backend's expected format param
            const formatMap = {
                'QR': 'qr',
                'CODE128': 'code128',
                'CODE39': 'code128', // Apple Wallet doesn't support Code39 → encode as Code128 (same charset, scanners will read it)
                'PDF417': 'pdf417',
                'AZTEC': 'aztec',
            };
            const barcodeFormat = formatMap[format] || 'qr'; // default to QR

            const queryParams = new URLSearchParams({
                firstName: user?.firstName || user?.prenom || '',
                lastName: user?.lastName || user?.nom || '',
                barcodeNumber: activeCode,
                className: user?.profile?.classe?.libelle || user?.classe?.libelle || "",
                schoolName: user?.nomEtablissement || user?.etablissement?.nom || user?.school || "",
                barcodeFormat, // 🆕 Pass the format detected from the physical badge scan
            }).toString();

            const backendUrl = `https://notifs.notianote.fr/api/generate-pass?${queryParams}`;

            console.log("Opening pass URL perfectly via Safari tunnel:", backendUrl);

            try {
                // Sur iOS, Safari va s'ouvrir sur ce lien tunnel. Comme il est en HTTPS, sans publicité,
                // sans avertissement IP et en "inline", Safari déclenche instantanément la popup Wallet!
                await Linking.openURL(backendUrl);
            } catch (err) {
                console.error("Could not open Wallet:", err);
                Alert.alert('Erreur', 'Impossible d\'ouvrir Apple Cartes.');
            }
        } catch (error) {
            console.error("Wallet error:", error);
            Alert.alert("Erreur", "Le serveur de génération de carte n'a pas pu être contacté.");
        } finally {
            setDownloadingPass(false);
        }
    };

    // Helper to render code
    const renderCode = () => {
        if (!activeCode) return <Text style={styles.errorText}>Pas de code</Text>;
        try {
            if (format === 'QR') {
                return (
                    <View style={{ padding: 10, backgroundColor: 'white' }}>
                        <QRCode value={String(activeCode)} size={200} color="black" backgroundColor="white" />
                    </View>
                );
            }

            if (format === 'CODE128') {
                return (
                    <View style={{ padding: 10, backgroundColor: 'white', width: '100%', alignItems: 'center' }}>
                        <Code128Barcode
                            value={activeCode}
                            width={width - 80}
                            height={80}
                            color="black"
                        />
                    </View>
                );
            }

            // Default to Code39
            return (
                <View style={{ padding: 10, backgroundColor: 'white', width: '100%', alignItems: 'center' }}>
                    <Code39Barcode
                        value={activeCode}
                        width={width - 80}
                        height={80}
                        color="black"
                    />
                </View>
            );
        } catch (e) {
            console.log(e);
            return <Text style={{ color: 'red' }}>Erreur d'affichage</Text>;
        }
    };

    if (showCamera) {
        if (!permission || !permission.granted) return <View style={{ flex: 1, backgroundColor: 'black' }} />;
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "code39", "code128"],
                    }}
                >
                    <View style={styles.cameraOverlay}>
                        <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeCameraButton}>
                            <X color="white" size={30} />
                        </TouchableOpacity>
                        <View style={[styles.scanTarget, { borderColor: theme.colors.primary }]} />
                        <Text style={styles.scanText}>Placez le code-barres dans le cadre</Text>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <LinearGradient colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ ...styles.iconButton, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                    <ChevronLeft color={theme.dark ? "#FFF" : theme.colors.onBackground} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]}>Carte Cantine</Text>
                <TouchableOpacity onPress={() => setShowSettings(true)} style={{ ...styles.iconButton, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                    <Settings color={theme.colors.onBackground} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
                ) : !moduleEnabled && !manualOverride ? (
                    <View style={styles.errorContainer}>
                        <Info color="#94A3B8" size={48} />
                        <Text style={styles.errorTitle}>Service non disponible</Text>
                        <Text style={styles.errorText}>Le module cantine n'est pas activé.</Text>
                        <TouchableOpacity onPress={() => { setShowSettings(true); }} style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.scanButtonText}>Activer manuellement</Text>
                        </TouchableOpacity>
                    </View>
                ) : !activeCode && !manualOverride ? (
                    <View style={styles.errorContainer}>
                        <Info color="#EF4444" size={48} />
                        <Text style={styles.errorTitle}>Code introuvable</Text>
                        <Text style={styles.errorText}>Aucun numéro de badge détecté.</Text>
                        <TouchableOpacity onPress={() => { setShowSettings(true); }} style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.scanButtonText}>Scanner ma carte physique</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cardContainer}>
                        {/* User Info */}
                        <View style={styles.studentInfo}>
                            <CustomProfilePhoto
                                accountID={user?.id || accountID}
                                size={50}
                                style={{ marginRight: 15 }}
                            />
                            <View>
                                <Text style={styles.studentName}>{user?.firstName || user?.prenom} {user?.lastName || user?.nom}</Text>
                                <Text style={styles.studentClass}>
                                    {user?.profile?.classe?.libelle || user?.classe?.libelle || "Classe inconnue"}
                                </Text>
                                <Text style={[styles.studentClass, { fontSize: 12, opacity: 0.8 }]}>
                                    {user?.nomEtablissement || user?.etablissement?.nom || user?.school || ""}
                                </Text>
                            </View>
                        </View>

                        {/* Code Display */}
                        <View style={styles.codeWrapper}>
                            <View style={styles.whiteBox}>
                                {renderCode()}
                            </View>
                            <Text style={styles.codeText}>{activeCode}</Text>
                            <Text style={styles.formatText}>{format === 'QR' ? 'QR Code' : format}</Text>
                        </View>

                        {manualOverride && (
                            <TouchableOpacity onPress={resetManualCode} style={styles.resetBadge}>
                                <Text style={styles.resetText}>⚠️ Code Personnalisé (Tap to Reset)</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.cardFooter}>
                            <Text style={styles.footerText}>NotiaNote • Carte Officielle</Text>
                        </View>
                    </View>
                )}

                {/* Instructions */}
                {activeCode && (
                    <View style={[styles.instructions, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '40' }]}>
                        <Text style={[styles.instructionTitle, { color: theme.colors.primary }]}>ℹ️ Info</Text>
                        <Text style={[styles.instructionText, { color: theme.colors.onSurface }]}>
                            Utilisez le bouton ⚙️ en haut à droite pour changer le format (Code39, Code128, QR) ou scanner votre carte physique.
                        </Text>
                    </View>
                )}

                {/* Apple Wallet Badge - iOS only */}
                {activeCode && Platform.OS === 'ios' && (
                    <TouchableOpacity
                        style={[styles.appleWalletBadgeWrapper, downloadingPass && { opacity: 0.5 }]}
                        onPress={generateAppleWalletPass}
                        disabled={downloadingPass}
                    >
                        {downloadingPass ? (
                            <ActivityIndicator color="white" size="small" style={{ backgroundColor: '#000', padding: 10, borderRadius: 8, width: 170, height: 50, justifyContent: 'center' }} />
                        ) : (
                            <Image
                                source={require('../../../../assets/apple_wallet.png')}
                                style={{ width: 170, height: 50, resizeMode: 'contain' }}
                            />
                        )}
                    </TouchableOpacity>
                )}

                {/* Banner Ad at bottom */}
                <BannerAdComponent placement="cantine" />
            </ScrollView>

            {/* Settings Modal */}
            <Modal visible={showSettings} animationType="slide" transparent statusBarTranslucent>
                <View style={styles.modalWrapper}>
                    <TouchableOpacity activeOpacity={1} onPress={() => setShowSettings(false)} style={styles.modalOverlay}>
                        <BlurView intensity={Platform.OS === 'ios' ? 20 : 50} tint="dark" style={StyleSheet.absoluteFill} />
                    </TouchableOpacity>

                    <View style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme.dark ? '#1E293B' : '#FFFFFF',
                            paddingBottom: insets.bottom + 30
                        }
                    ]}>
                        {/* Pull handle */}
                        <View style={[styles.pullHandle, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />

                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.dark ? 'white' : 'black' }]}>Paramètres Cantine</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)} style={[styles.closeModalBtn, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                <X color={theme.dark ? "#94A3B8" : "black"} size={20} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Format d'affichage</Text>
                        <View style={styles.optionsRow}>
                            {['CODE39', 'CODE128', 'QR'].map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    style={[
                                        styles.optionBtn,
                                        { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                                        format === f && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => saveFormat(f)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        format === f && styles.optionTextActive,
                                        format === f && theme.colors.primary === '#FAFAFA' && { color: 'black' }
                                    ]}>
                                        {f === 'QR' ? 'QR CODE' : f.replace('CODE', 'CODE ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.separator, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                        <Text style={styles.sectionTitle}>Saisie Manuelle</Text>
                        <CustomTextInput
                            label="Numéro de badge"
                            icon={<Hash color={theme.dark ? "#94A3B8" : "black"} size={20} />}
                            initialValue={tempManualCode || manualOverride || ""}
                            onChangeText={setTempManualCode}
                            keyboardType="default"
                            style={{ marginBottom: 15 }}
                        />
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary, marginBottom: 20 }]}
                            onPress={handleSaveManual}
                        >
                            <Save color={theme.colors.primary === '#FAFAFA' ? "black" : "white"} size={20} style={{ marginRight: 10 }} />
                            <Text style={[styles.actionButtonText, theme.colors.primary === '#FAFAFA' && { color: 'black' }]}>Enregistrer</Text>
                        </TouchableOpacity>

                        <View style={[styles.separator, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

                        <Text style={styles.sectionTitle}>Scanner Carte Physique</Text>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                            onPress={async () => {
                                setShowSettings(false);
                                setScanned(false);
                                if (!permission?.granted) {
                                    const res = await requestPermission();
                                    if (res.granted) {
                                        setShowCamera(true);
                                    }
                                    // Apple Review Fix: Do not redirect or prompt user to go to Settings if they deny.
                                } else {
                                    setShowCamera(true);
                                }
                            }}
                        >
                            <CameraIcon color={theme.colors.primary === '#FAFAFA' ? "black" : "white"} size={20} style={{ marginRight: 10 }} />
                            <Text style={[styles.actionButtonText, theme.colors.primary === '#FAFAFA' && { color: 'black' }]}>Utiliser la caméra</Text>
                        </TouchableOpacity>
                        <Text style={[styles.hintText, { color: theme.dark ? '#64748B' : '#94A3B8' }]}>
                            Si le code ci-dessus ne marche pas, scannez directement votre carte pour l'écraser.
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    centerContainer: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10,
    },
    iconButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
    content: { padding: 20, alignItems: 'center' },
    cardContainer: {
        width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, padding: 24,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, marginBottom: 30,
    },
    studentInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)', paddingBottom: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    studentName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    studentClass: { fontSize: 14, color: '#64748B' },
    codeWrapper: { alignItems: 'center', marginVertical: 10 },
    whiteBox: { backgroundColor: 'white', padding: 5, borderRadius: 8 }, // Container for code
    codeText: { marginTop: 10, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 2 },
    formatText: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    resetBadge: { marginTop: 10, padding: 5, backgroundColor: '#FEF3C7', borderRadius: 5 },
    resetText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
    cardFooter: { alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', marginTop: 15 },
    footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    errorContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    errorTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
    errorText: { color: '#94A3B8', textAlign: 'center', marginTop: 5 },
    scanButton: { marginTop: 20, backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    scanButtonText: { color: 'white', fontWeight: 'bold' },
    instructions: { width: '100%', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    instructionTitle: { color: '#8B5CF6', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    instructionText: { color: '#CBD5E1', lineHeight: 20 },

    // Apple Wallet Badge Styles
    appleWalletBadgeWrapper: { alignSelf: 'center', marginBottom: 25 },

    // Modal
    modalWrapper: { flex: 1, justifyContent: 'flex-end' },
    modalOverlay: { ...StyleSheet.absoluteFillObject },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 12, // Reduced for handle
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20
    },
    pullHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
        marginTop: 8
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: 'bold' },
    closeModalBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', marginBottom: 16, fontWeight: 'bold', letterSpacing: 1 },
    optionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    optionBtn: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, borderWidth: 1.5 },
    optionText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 13 },
    optionTextActive: { color: 'white' },
    separator: { height: 1, marginBottom: 24 },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20 },
    actionButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    hintText: { fontSize: 12, textAlign: 'center', marginTop: 15, lineHeight: 18, paddingHorizontal: 10 },

    // Camera
    cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scanTarget: { width: 250, height: 250, borderWidth: 2, borderRadius: 20, backgroundColor: 'transparent' },
    closeCameraButton: { position: 'absolute', top: 50, right: 20, padding: 10 },
    scanText: { color: 'white', marginTop: 20, fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8 },
});
