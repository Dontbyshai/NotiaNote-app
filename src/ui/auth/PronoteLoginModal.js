import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
    Dimensions, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    MapPin, Search, QrCode, Link2, X, ChevronLeft,
    ArrowRight, Lock
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { geolocation, cleanURL, instance } from 'pawnote';
import { loginQrCode, createSessionHandle } from 'pawnote';

import HapticsHandler from '../../core/HapticsHandler';
import { PronoteDriver } from '../../core/drivers/PronoteDriver';
import SchoolSearchModal from './SchoolSearchModal';
import PronoteWebViewModal from './PronoteWebViewModal';

const { height, width } = Dimensions.get('window');

// ─── Sub-screens ─────────────────────────────────────────────────────────────

/** QR code scanner screen */
function QRScreen({ onBack, onSchoolFound }) {
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [pinVisible, setPinVisible] = useState(false);
    const [pin, setPin] = useState('');
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);

    const uuidv4 = () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

    const handleBarCode = ({ data }) => {
        HapticsHandler.vibrate('light');
        setScanned(true);
        setQrData(data);
        setPinVisible(true);
    };

    const confirmQR = async () => {
        if (pin.length !== 4) { Alert.alert('Erreur', 'Le code PIN doit faire exactement 4 chiffres.'); return; }
        setPinVisible(false);
        setLoading(true);
        try {
            const decoded = JSON.parse(qrData);
            const deviceUUID = uuidv4();
            const handle = createSessionHandle();
            const refresh = await loginQrCode(handle, {
                qr: { jeton: decoded.jeton, login: decoded.login, url: decoded.url },
                pin,
                deviceUUID,
            });
            const status = await PronoteDriver.loginWithToken(refresh.username, refresh.token, refresh.url, '', deviceUUID);
            if (status === 1) onSchoolFound({ url: refresh.url });
            else Alert.alert('Erreur', 'Connexion via QR échouée.');
        } catch (e) {
            console.error('[QRScreen]', e);
            Alert.alert('Erreur', 'QR invalide ou PIN incorrect.');
        } finally {
            setLoading(false);
            setScanned(false);
            setQrData(null);
            setPin('');
        }
    };

    if (!permission?.granted) {
        return (
            <View style={qrStyles.permContainer}>
                <QrCode size={60} color="#A855F7" />
                <Text style={qrStyles.permTitle}>Accès à la caméra requis</Text>
                <Text style={qrStyles.permSubtitle}>Pour scanner le QR code PRONOTE</Text>
                <TouchableOpacity style={qrStyles.permBtn} onPress={requestPermission}>
                    <Text style={qrStyles.permBtnText}>Autoriser</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
                    <Text style={{ color: '#64748B', fontFamily: 'Text-Medium', fontSize: 14 }}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Camera */}
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCode}
            />

            {/* Dark overlay */}
            <View style={qrStyles.overlay} />

            {/* Viewfinder */}
            <View style={qrStyles.viewfinder} />

            {/* Instructions */}
            <View style={[qrStyles.instructions, { paddingTop: insets.top + 20 }]}>
                <Text style={qrStyles.instrTitle}>Scanner le QR PRONOTE</Text>
                <Text style={qrStyles.instrSub}>Sur PRONOTE → Menu → Connexion avec QR code</Text>
            </View>

            {/* Back button */}
            <TouchableOpacity
                onPress={onBack}
                style={[qrStyles.backBtn, { top: insets.top + 12 }]}
            >
                <ChevronLeft size={22} color="#FFF" />
            </TouchableOpacity>

            {/* Loading overlay */}
            {loading && (
                <View style={StyleSheet.absoluteFillObject}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#A855F7" />
                        <Text style={{ color: '#FFF', marginTop: 16, fontFamily: 'Text-Medium', fontSize: 16 }}>Connexion...</Text>
                    </View>
                </View>
            )}

            {/* PIN modal */}
            <Modal visible={pinVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={qrStyles.pinOverlay}>
                        <View style={qrStyles.pinSheet}>
                            <View style={qrStyles.pinHandle} />
                            <View style={{ alignItems: 'center', marginBottom: 32 }}>
                                <Lock size={40} color="#A855F7" style={{ marginBottom: 16 }} />
                                <Text style={qrStyles.pinTitle}>Code de validation</Text>
                                <Text style={qrStyles.pinSubtitle}>
                                    Saisissez le code PIN à 4 chiffres{'\n'}affiché sur PRONOTE
                                </Text>
                            </View>
                            <TextInput
                                style={qrStyles.pinInput}
                                placeholder="••••"
                                placeholderTextColor="#4B5563"
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                                value={pin}
                                onChangeText={setPin}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[qrStyles.pinConfirm, pin.length !== 4 && { opacity: 0.4 }]}
                                onPress={confirmQR}
                                disabled={pin.length !== 4}
                            >
                                <LinearGradient colors={['#A855F7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={16} />
                                <Text style={qrStyles.pinConfirmText}>CONFIRMER</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setPinVisible(false); setScanned(false); setQrData(null); setPin(''); }}>
                                <Text style={qrStyles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

/** Direct URL input screen */
function URLScreen({ onBack, onURLConfirmed }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = async () => {
        if (!url.trim()) return;
        if (url.includes('http://')) {
            Alert.alert('Protocole non supporté', 'Seules les URL HTTPS sont acceptées pour des raisons de sécurité.');
            return;
        }
        setLoading(true);
        try {
            const clean = cleanURL(url.trim());
            await instance(clean); // validates the instance
            onURLConfirmed(clean);
        } catch (e) {
            Alert.alert('Instance inaccessible', 'Impossible de contacter cette instance PRONOTE. Vérifiez l\'URL et réessayez.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#0F172A' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <LinearGradient colors={['#2E1065', '#0F172A']} style={StyleSheet.absoluteFillObject} />

            {/* Header */}
            <View style={urlStyles.header}>
                <TouchableOpacity onPress={onBack} style={urlStyles.backBtn}>
                    <ChevronLeft size={22} color="#FFF" />
                </TouchableOpacity>
                <Text style={urlStyles.headerTitle}>URL DE CONNEXION</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                    <View style={urlStyles.iconWrap}>
                        <Link2 size={32} color="#A855F7" />
                    </View>
                    <Text style={urlStyles.title}>Entrez votre URL PRONOTE</Text>
                    <Text style={urlStyles.subtitle}>
                        Trouvez l'adresse dans votre navigateur en allant sur votre espace PRONOTE habituel.
                    </Text>
                </View>

                <View style={urlStyles.inputWrap}>
                    <Link2 size={18} color="#A855F7" style={{ marginRight: 12, opacity: 0.7 }} />
                    <TextInput
                        style={urlStyles.input}
                        placeholder="https://monlycee.index-education.net/pronote/"
                        placeholderTextColor="#4B5563"
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        returnKeyType="go"
                        onSubmitEditing={validate}
                    />
                </View>

                <TouchableOpacity
                    style={[urlStyles.confirmBtn, (!url.trim() || loading) && { opacity: 0.4 }]}
                    onPress={validate}
                    disabled={!url.trim() || loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient colors={['#A855F7', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} borderRadius={20} />
                    {loading
                        ? <ActivityIndicator color="#FFF" />
                        : <Text style={urlStyles.confirmText}>CONTINUER</Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PronoteLoginModal({ onClose, onSuccess }) {
    const insets = useSafeAreaInsets();

    // 'menu' | 'qr' | 'url' | 'search' | 'webview'
    const [screen, setScreen] = useState('menu');
    const [webviewURL, setWebviewURL] = useState(null);
    const [geoLoading, setGeoLoading] = useState(false);

    const openWebview = (url) => {
        setWebviewURL(url);
        setScreen('webview');
    };

    const handleGeolocation = async () => {
        setGeoLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission refusée', 'L\'accès à la localisation est nécessaire pour trouver les établissements proches.');
                setGeoLoading(false);
                return;
            }
            const pos = await Location.getCurrentPositionAsync({});
            const schools = await geolocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            if (!schools.length) {
                Alert.alert('Aucun résultat', 'Aucun établissement PRONOTE trouvé près de vous.');
                setGeoLoading(false);
                return;
            }
            // Show inline picker (reuse SchoolSearchModal flow via 'search' screen with prefilled results)
            setGeoResults(schools.map(s => ({
                id: s.url, name: s.name,
                address: `${(s.distance / 10).toFixed(1)} km`,
                url: s.url
            })));
            setScreen('geoResults');
        } catch (e) {
            console.error('[PronoteGeo]', e);
            Alert.alert('Erreur', 'Impossible d\'obtenir votre position.');
        } finally {
            setGeoLoading(false);
        }
    };

    const [geoResults, setGeoResults] = useState([]);

    const METHODS = [
        {
            id: 'geo',
            icon: <MapPin size={26} color="#A855F7" />,
            title: 'Autour de moi',
            subtitle: 'Trouver mon établissement via GPS',
            onPress: handleGeolocation,
        },
        {
            id: 'search',
            icon: <Search size={26} color="#3B82F6" />,
            title: 'Rechercher une ville',
            subtitle: 'Recherche par ville ou code postal',
            onPress: () => setScreen('search'),
        },
        {
            id: 'qr',
            icon: <QrCode size={26} color="#10B981" />,
            title: 'QR Code',
            subtitle: 'Scanner le QR code depuis PRONOTE',
            onPress: () => setScreen('qr'),
        },
        {
            id: 'url',
            icon: <Link2 size={26} color="#F59E0B" />,
            title: 'URL de connexion',
            subtitle: 'J\'ai l\'adresse directe de mon instance',
            onPress: () => setScreen('url'),
        },
    ];

    // ── Render sub-screens ────────────────────────────────────────────────────

    if (screen === 'qr') {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setScreen('menu')}>
                <QRScreen
                    onBack={() => setScreen('menu')}
                    onSchoolFound={({ url }) => openWebview(url)}
                />
            </Modal>
        );
    }

    if (screen === 'url') {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setScreen('menu')}>
                <URLScreen
                    onBack={() => setScreen('menu')}
                    onURLConfirmed={(url) => openWebview(url)}
                />
            </Modal>
        );
    }

    if (screen === 'search') {
        return (
            <Modal visible animationType="slide" transparent onRequestClose={() => setScreen('menu')}>
                <SchoolSearchModal
                    service="pronote"
                    onClose={() => setScreen('menu')}
                    onSelect={(school) => openWebview(school.url)}
                />
            </Modal>
        );
    }

    if (screen === 'geoResults') {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setScreen('menu')}>
                <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
                    <LinearGradient colors={['#2E1065', '#0F172A']} style={StyleSheet.absoluteFillObject} />
                    <View style={[menuStyles.header, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => setScreen('menu')} style={menuStyles.backBtn}>
                            <ChevronLeft size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={menuStyles.headerTitle}>ÉTABLISSEMENTS PROCHES</Text>
                        <View style={{ width: 44 }} />
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {geoResults.map(school => (
                            <TouchableOpacity
                                key={school.id}
                                style={menuStyles.schoolCard}
                                activeOpacity={0.7}
                                onPress={() => openWebview(school.url)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={menuStyles.schoolName}>{school.name}</Text>
                                    <Text style={menuStyles.schoolAddr}>{school.address}</Text>
                                </View>
                                <ArrowRight size={18} color="#A855F7" />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        );
    }

    if (screen === 'webview' && webviewURL) {
        return (
            <Modal visible animationType="slide" onRequestClose={() => setScreen('menu')}>
                <PronoteWebViewModal
                    url={webviewURL}
                    onClose={() => { setWebviewURL(null); setScreen('menu'); }}
                    onSuccess={onSuccess}
                />
            </Modal>
        );
    }

    // ── Menu screen ───────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={menuStyles.overlay}>
            <TouchableOpacity style={menuStyles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={menuStyles.container}>
                <View style={menuStyles.dragIndicator} />

                {/* Header */}
                <View style={menuStyles.header}>
                    <Text style={menuStyles.title}>Choisissez votre méthode de connexion</Text>
                    <TouchableOpacity onPress={onClose} style={menuStyles.closeBtn}>
                        <X color="#FFF" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* Method cards */}
                    {METHODS.map((method, i) => (
                        <TouchableOpacity
                            key={method.id}
                            style={menuStyles.card}
                            activeOpacity={0.7}
                            onPress={method.onPress}
                            disabled={method.id === 'geo' && geoLoading}
                        >
                            <LinearGradient
                                colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
                                style={StyleSheet.absoluteFill}
                                borderRadius={20}
                            />
                            <View style={menuStyles.iconBox}>
                                {method.id === 'geo' && geoLoading
                                    ? <ActivityIndicator size={22} color="#A855F7" />
                                    : method.icon
                                }
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={menuStyles.cardTitle}>{method.title}</Text>
                                <Text style={menuStyles.cardSub}>{method.subtitle}</Text>
                            </View>
                            <ArrowRight size={18} color="#FFFFFF" opacity={0.3} />
                        </TouchableOpacity>
                    ))}

                    {/* PRONOTE branding note */}
                    <View style={menuStyles.noteBox}>
                        <Text style={menuStyles.noteText}>
                            PRONOTE est un produit d'Index Éducation. NotiaNote n'est pas affilié à Index Éducation.
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const menuStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    container: {
        maxHeight: height * 0.85,
        backgroundColor: '#121128',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.4)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -20 },
        shadowOpacity: 0.8,
        shadowRadius: 35,
        elevation: 30,
        zIndex: 20,
    },
    dragIndicator: {
        width: 50,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 10,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 10
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 40 },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Text-Bold',
        letterSpacing: 0.5,
        textAlign: 'center'
    },
    closeBtn: { position: 'absolute', right: 24 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        padding: 20, marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
    },
    iconBox: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardTitle: {
        color: '#FFFFFF', fontSize: 16, fontFamily: 'Text-Bold', marginBottom: 4,
    },
    cardSub: {
        color: '#64748B', fontSize: 13, fontFamily: 'Text-Medium',
    },
    noteBox: {
        marginTop: 16, padding: 16, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    noteText: {
        color: '#475569', fontSize: 11, fontFamily: 'Text-Medium',
        textAlign: 'center', lineHeight: 16,
    },
    schoolCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    schoolName: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Text-Bold', marginBottom: 3 },
    schoolAddr: { color: '#64748B', fontSize: 13, fontFamily: 'Text-Medium' },
});

const qrStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    viewfinder: {
        position: 'absolute', alignSelf: 'center', top: '33%',
        width: 260, height: 260, borderRadius: 28,
        borderWidth: 2, borderColor: '#A855F7',
        backgroundColor: 'transparent',
    },
    instructions: {
        position: 'absolute', width: '100%',
        alignItems: 'center', paddingHorizontal: 24,
    },
    instrTitle: {
        color: '#FFF', fontSize: 18, fontFamily: 'Text-Bold',
        textAlign: 'center', marginBottom: 6,
    },
    instrSub: {
        color: 'rgba(255,255,255,0.6)', fontSize: 13,
        fontFamily: 'Text-Medium', textAlign: 'center',
    },
    backBtn: {
        position: 'absolute', left: 16, zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.12)',
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    permContainer: {
        flex: 1, backgroundColor: '#0F172A',
        alignItems: 'center', justifyContent: 'center', padding: 40,
    },
    permTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Text-Bold', marginTop: 20, marginBottom: 8 },
    permSubtitle: { color: '#64748B', fontSize: 14, fontFamily: 'Text-Medium', textAlign: 'center', marginBottom: 32 },
    permBtn: {
        backgroundColor: '#A855F7', paddingHorizontal: 40, paddingVertical: 16,
        borderRadius: 16, overflow: 'hidden',
    },
    permBtnText: { color: '#FFF', fontFamily: 'Text-Bold', fontSize: 16 },
    pinOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    pinSheet: {
        backgroundColor: '#121128', borderTopLeftRadius: 30, borderTopRightRadius: 30,
        padding: 28, paddingBottom: 40,
        borderTopWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
    },
    pinHandle: {
        width: 40, height: 5, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center', marginBottom: 28,
    },
    pinTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Text-Bold', marginBottom: 8 },
    pinSubtitle: {
        color: '#64748B', fontSize: 14, fontFamily: 'Text-Medium',
        textAlign: 'center', lineHeight: 20,
    },
    pinInput: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.4)',
        borderRadius: 16, padding: 18,
        color: '#FFF', fontSize: 28, textAlign: 'center',
        fontFamily: 'Text-Bold', marginBottom: 24, letterSpacing: 12,
    },
    pinConfirm: {
        height: 60, borderRadius: 16, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    pinConfirmText: { color: '#FFF', fontFamily: 'Text-Bold', fontSize: 15, letterSpacing: 1.5 },
    cancelText: {
        color: '#64748B', fontFamily: 'Text-Medium', fontSize: 14,
        textAlign: 'center', padding: 8,
    },
});

const urlStyles = StyleSheet.create({
    header: {
        height: 64, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 12,
        paddingTop: 50,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        color: '#94A3B8', fontSize: 11,
        fontFamily: 'Text-Bold', letterSpacing: 3,
    },
    iconWrap: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: 'rgba(168,85,247,0.1)',
        borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#FFFFFF', fontSize: 22, fontFamily: 'Text-Bold',
        textAlign: 'center', marginBottom: 12,
    },
    subtitle: {
        color: '#64748B', fontSize: 14, fontFamily: 'Text-Medium',
        textAlign: 'center', lineHeight: 20, paddingHorizontal: 20,
    },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1.5, borderColor: 'rgba(168,85,247,0.3)',
        borderRadius: 18, padding: 18, marginBottom: 20,
    },
    input: {
        flex: 1, color: '#FFF', fontSize: 15,
        fontFamily: 'Text-Medium',
    },
    confirmBtn: {
        height: 60, borderRadius: 20, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
    },
    confirmText: {
        color: '#FFF', fontFamily: 'Text-Bold',
        fontSize: 15, letterSpacing: 1.5,
    },
});
