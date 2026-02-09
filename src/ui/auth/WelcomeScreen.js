import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    TouchableWithoutFeedback,
    ScrollView,
    Linking,
    Platform,
    Keyboard,
    Alert,
    TextInput,
    ActivityIndicator,
    Easing,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Bug, Mail, ChevronRight, ArrowLeft, MoreHorizontal, Check, Circle, Eye, EyeOff, School, Utensils, GraduationCap, User, Lock } from 'lucide-react-native';
import EcoleDirecteApi from '../../services/EcoleDirecteApi';
import AccountHandler from '../../core/AccountHandler';
import { useGlobalAppContext } from '../../util/GlobalAppContext';


const { width, height } = Dimensions.get('window');

const SUB_CATEGORIES = {
    ent: [
        { id: 'skolengo_ent', name: 'Skolengo', subtitle: 'ENT National', logo: require('../../../assets/logo-skolengo.png'), disabled: true },
    ],
    restauration: [
        { id: 'turboself', name: 'TurboSelf', subtitle: 'Restauration scolaire', logo: require('../../../assets/logo-turboself.png'), disabled: true },
        { id: 'alise', name: 'Alise', subtitle: 'Restauration scolaire', logo: require('../../../assets/logo-alise.jpg'), disabled: true },
        { id: 'izly', name: 'Izly', subtitle: 'Paiement Crous', logo: require('../../../assets/logo-izly.png'), disabled: true },
        { id: 'ard', name: 'ARD', subtitle: 'Gestion d\'accès', logo: require('../../../assets/logo-ard.png'), disabled: true },
    ],
    universitaire: [
        { id: 'uca', name: 'UCA', subtitle: "Univ. Côte d'Azur", logo: require('../../../assets/logo-uca.png'), disabled: true },
        { id: 'sorbonne', name: 'Sorbonne', subtitle: 'Univ. Paris', logo: require('../../../assets/logo-sorbonne.png'), disabled: true },
        { id: 'limoges', name: 'Limoges', subtitle: 'Univ. Limoges', logo: require('../../../assets/logo-limoges.png'), disabled: true },
        { id: 'lorraine', name: 'Lorraine', subtitle: 'Univ. Lorraine', logo: require('../../../assets/logo-lorraine.png'), disabled: true },
        { id: 'nimes', name: 'Nîmes', subtitle: 'Univ. Nîmes', logo: require('../../../assets/logo-nimes.png'), disabled: true },
        { id: 'uphf', name: 'UPHF', subtitle: 'Hauts-de-France', logo: require('../../../assets/logo-uphf.png'), disabled: true },
        { id: 'sciencepo', name: 'SciencePo', subtitle: 'IEP Paris', logo: require('../../../assets/logo-sciencepo.webp'), disabled: true },
        { id: 'hec', name: 'HEC', subtitle: 'Éc. de Commerce', logo: require('../../../assets/logo-hec.webp'), disabled: true },
    ]
};

export default function WelcomeScreen({ navigation }) {
    const { setIsLoggedIn } = useGlobalAppContext();
    const [showConnectionOptions, setShowConnectionOptions] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [showBackdrop, setShowBackdrop] = useState(false);

    // Animations
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const tagsOpacity = useRef(new Animated.Value(0)).current;
    const buttonSlide = useRef(new Animated.Value(50)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const bottomSheetSlide = useRef(new Animated.Value(height)).current;
    const loginFormSlide = useRef(new Animated.Value(height)).current;
    const keyboardOffset = useRef(new Animated.Value(0)).current;

    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 2FA State
    const [is2FAVisible, setIs2FAVisible] = useState(false);
    const [twoFAQuestion, setTwoFAQuestion] = useState('');
    const [twoFAOptions, setTwoFAOptions] = useState([]); // [{raw, decoded}]
    const [rawOptions, setRawOptions] = useState([]);
    const [selected2FAIndex, setSelected2FAIndex] = useState(-1);
    const [tempToken, setTempToken] = useState('');
    const [twoFaTokenHeader, setTwoFaTokenHeader] = useState('');

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert("Erreur", "Veuillez entrer votre identifiant et mot de passe.");
            return;
        }

        setIsLoading(true);
        Keyboard.dismiss();

        // Utiliser AccountHandler
        const status = await AccountHandler.login(username, password);

        setIsLoading(false);

        if (status === 1) { // Succès
            console.log("[WelcomeScreen] Login successful, switching to AppStack");
            setIsLoggedIn(true);
        } else if (status === 2) { // Multi-comptes
            // TODO: Implémenter la sélection de compte
            Alert.alert("Multi-comptes", "Veuillez sélectionner un compte (à implémenter)");
            setIsLoggedIn(true); // Pour l'instant on connecte quand même
        } else if (status === 3) { // 2FA requis
            console.log("[WelcomeScreen] 2FA required, navigating to DoubleAuthPopup");
            navigation.navigate("DoubleAuthPopup");
            return;
        } else {
            // ECHEC DU LOGIN ? VÉRIFIONS SI LE TOKEN EST QUAND MÊME LÀ
            // (Cas fréquent sur simulateur : Login Timeout mais Token sauvegardé)
            const savedAccount = await AccountHandler.getMainAccount();
            if (savedAccount && savedAccount.id) {
                console.log("[WelcomeScreen] ⚠️ Login failed/timeout but session exists! Forcing entry.");
                setIsLoggedIn(true);
                return;
            }

            if (status === 0) { // Mauvais mot de passe
                Alert.alert("Erreur", "Identifiant ou mot de passe incorrect.");
            } else { // Erreur serveur
                Alert.alert("Erreur", "Une erreur est survenue lors de la connexion.");
            }
        }
    };

    const submit2FA = async () => {
        if (selected2FAIndex === -1) {
            Alert.alert("Attention", "Veuillez sélectionner une réponse.");
            return;
        }

        setIsLoading(true);
        const choiceRaw = rawOptions[selected2FAIndex];

        const result = await EcoleDirecteApi.sendDoubleAuthResponse(tempToken, twoFaTokenHeader, choiceRaw);

        if (result.status === 200) {
            // Sauvegarder cn/cv pour le prochain login
            // Re-login avec AccountHandler (qui utilisera automatiquement cn/cv sauvegardés)
            const status = await AccountHandler.login(username, password);

            setIsLoading(false);

            if (status === 1) { // Succès
                setIs2FAVisible(false);
                console.log("[WelcomeScreen] 2FA successful, switching to AppStack");
                setIsLoggedIn(true);
            } else {
                Alert.alert("Erreur", "Échec de la connexion après validation 2FA.");
            }
        } else {
            setIsLoading(false);
            Alert.alert("Erreur", "Mauvaise réponse ou session expirée.");
        }
    };

    // Button pulse animation for the glow effect
    const buttonPulse = useRef(new Animated.Value(1)).current;
    // Shockwave animation ref
    const shockwave = useRef(new Animated.Value(0)).current;

    // Keyboard listener to reset form position when keyboard hides
    useEffect(() => {
        const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
            Animated.timing(keyboardOffset, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });

        return () => keyboardHideListener.remove();
    }, []);

    useEffect(() => {
        // Animation sequence
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(tagsOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(buttonSlide, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(buttonOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            // Start loop animations
            Animated.loop(
                Animated.parallel([
                    // Button Breathing
                    Animated.sequence([
                        Animated.timing(buttonPulse, {
                            toValue: 1.03,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(buttonPulse, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ]),
                    // Shockwave Expansion
                    Animated.timing(shockwave, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    }, []);

    // Interpolations for Shockwave
    // Onde 1 (plus large)
    const wave1ScaleX = shockwave.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.2]
    });
    const wave1ScaleY = shockwave.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.6]
    });
    const wave1Opacity = shockwave.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.1, 0]
    });

    // Onde 2 (plus serrée, légèrement décalée visuellement via opacity)
    const wave2ScaleX = shockwave.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1]
    });
    const wave2ScaleY = shockwave.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.3]
    });
    const wave2Opacity = shockwave.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 0.2, 0]
    });

    const handleCommencer = () => {
        setShowConnectionOptions(true);
        setShowBackdrop(true);
        Animated.parallel([
            Animated.spring(bottomSheetSlide, {
                toValue: 0,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }),
            // Fade out button smoothly
            Animated.timing(buttonOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    };

    const handleClose = () => {
        // Hide backdrop immediately
        setShowBackdrop(false);

        // Then animate the sheets out
        Animated.parallel([
            Animated.spring(bottomSheetSlide, {
                toValue: height,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.spring(loginFormSlide, {
                toValue: height,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }),
            // Fade in button smoothly with a slight delay
            Animated.timing(buttonOpacity, {
                toValue: 1,
                duration: 300,
                delay: 100,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowConnectionOptions(false);
            setSelectedService(null);
        });
    };

    const handleServiceSelect = (service) => {
        if (['ent', 'restauration', 'universitaire'].includes(service)) {
            setActiveCategory(service);
            return;
        }

        if (service === 'autre') {
            Alert.alert(
                "Service Indisponible",
                "Ce service est actuellement indisponible.\nNous travaillons actuellement dessus pour vous offrir d'autres services.",
                [{ text: "Fermer", style: "cancel" }]
            );
            return;
        }

        if (service === 'pronote') {
            Alert.alert(
                "Bientôt disponible",
                "L'intégration Pronote est en cours de développement.\nElle sera disponible dans une prochaine mise à jour.",
                [{ text: "Fermer", style: "cancel" }]
            );
            return;
        }

        setSelectedService(service);
        setShowBackdrop(true);
        Animated.parallel([
            // On ne ferme plus bottomSheetSlide pour garder le logo en haut
            Animated.spring(loginFormSlide, {
                toValue: 0,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleBackFromLogin = () => {
        Animated.parallel([
            Animated.timing(loginFormSlide, {
                toValue: height,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(bottomSheetSlide, {
                toValue: 0,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setSelectedService(null);
        });
    };

    const handleOpenPrivacy = () => {
        navigation.navigate('PrivacyPolicyPage');
    };


    const handleGitHub = () => {
        Linking.openURL('https://github.com/Dontbyshai/NotiaNote');
    };

    const handleOpenContact = () => {
        navigation.navigate('ContactPage');
    };


    const handleBugReport = () => {
        navigation.navigate('BugReportPage');
    };

    const handleContactMail = () => {
        navigation.navigate('ContactPage');
    };

    const contentOffset = bottomSheetSlide.interpolate({
        inputRange: [0, height],
        outputRange: [-100, 0], // Remonte un peu moins (100px)
        extrapolate: 'clamp',
    });

    const contentScale = bottomSheetSlide.interpolate({
        inputRange: [0, height],
        outputRange: [0.9, 1], // Reste plus grand (90%)
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Starry Background with blur effects */}
            {/* Simple Dark Gradient Background matching Violet theme */}
            <LinearGradient
                colors={['#2E1065', '#0F172A']}
                style={styles.gradient}
            />

            {/* Main Content - Centered */}
            <Animated.View
                style={[
                    styles.mainContent,
                    {
                        transform: [
                            { translateY: contentOffset },
                            { scale: contentScale }
                        ]
                    },
                ]}
            >
                {/* Logo */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <Image
                        source={require('../../../assets/notianote-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Title */}
                <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
                    NotiaNote
                </Animated.Text>

                {/* Subtitle */}
                <Animated.Text style={[styles.subtitle, { opacity: titleOpacity }]}>
                    Votre scolarité, réinventée.
                </Animated.Text>

                {/* Tags */}
                <Animated.View style={[styles.tagsContainer, { opacity: tagsOpacity }]}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Notes</Text>
                    </View>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Devoirs</Text>
                    </View>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>Agenda</Text>
                    </View>
                </Animated.View>

                {/* Commencer Button with pulse glow */}
                <Animated.View
                    style={[
                        styles.buttonWrapper,
                        {
                            opacity: buttonOpacity,
                            transform: [
                                { translateY: buttonSlide },
                                { scale: buttonPulse }
                            ],
                        },
                    ]}
                    pointerEvents={showConnectionOptions ? 'none' : 'auto'}
                >
                    {/* Shockwave Layers (Echos) */}
                    <Animated.View
                        style={[
                            styles.waveLayer,
                            {
                                transform: [
                                    { scaleX: wave1ScaleX },
                                    { scaleY: wave1ScaleY }
                                ],
                                opacity: wave1Opacity,
                                zIndex: -2,
                            }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.waveLayer,
                            {
                                transform: [
                                    { scaleX: wave2ScaleX },
                                    { scaleY: wave2ScaleY }
                                ],
                                opacity: wave2Opacity,
                                zIndex: -1,
                            }
                        ]}
                    />

                    <TouchableOpacity
                        style={styles.commencerButton}
                        onPress={handleCommencer}
                        activeOpacity={0.8}
                        disabled={showConnectionOptions}
                    >
                        <Text style={styles.commencerButtonText}>Commencer</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Footer Links */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={handleOpenPrivacy}>
                    <Text style={styles.footerLink}>Confidentialité</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGitHub}>
                    <Text style={styles.footerLink}>GitHub</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenContact}>
                    <Text style={styles.footerLink}>Contact</Text>
                </TouchableOpacity>
            </View>

            {/* Backdrop for closing bottom sheet */}
            {
                showBackdrop && (
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={styles.backdrop} />
                    </TouchableWithoutFeedback>
                )
            }

            {/* Connection Options Bottom Sheet */}
            {
                showConnectionOptions && !selectedService && (
                    <Animated.View
                        style={[
                            styles.bottomSheet,
                            {
                                transform: [{ translateY: bottomSheetSlide }],
                            },
                        ]}
                    >
                        <View style={styles.bottomSheetHandle} />

                        {activeCategory ? (
                            <View style={styles.categoryHeader}>
                                <TouchableOpacity onPress={() => setActiveCategory(null)} style={styles.backButton}>
                                    <ArrowLeft size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                                <Text style={styles.categoryTitle}>
                                    {activeCategory === 'ent' ? 'ENT NATIONAUX' : activeCategory === 'restauration' ? 'RESTAURATION' : 'UNIVERSITÉS'}
                                </Text>
                                <View style={{ width: 40 }} />
                            </View>
                        ) : (
                            <Text style={styles.bottomSheetTitle}>CHOISISSEZ VOTRE PLATEFORME</Text>
                        )}

                        <ScrollView
                            style={styles.servicesScroll}
                            contentContainerStyle={styles.servicesGrid}
                            showsVerticalScrollIndicator={false}
                        >
                            {!activeCategory ? (
                                <View style={styles.servicesGrid}>
                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.cardActive]}
                                        onPress={() => handleServiceSelect('ecoledirecte')}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={['rgba(139, 92, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.serviceIconContainer}>
                                            <View style={styles.logoContainerWhite}>
                                                <Image
                                                    source={require('../../../assets/logo-ecoledirecte.png')}
                                                    style={styles.serviceLogoImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>EcoleDirecte</Text>
                                            <Text style={styles.serviceSubtitle}>Élève ou Parent</Text>
                                        </View>
                                        <View style={styles.arrowContainer}>
                                            <ChevronRight size={18} color="#FFFFFF" opacity={0.5} />
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.disabledCard]}
                                        activeOpacity={0.9}
                                        onPress={() => Alert.alert("Bientôt disponible", "L'intégration Pronote est en cours de développement.")}
                                    >
                                        <View style={styles.serviceIconContainer}>
                                            <View style={styles.logoContainerTransparent}>
                                                <Image
                                                    source={require('../../../assets/logo-pronote.png')}
                                                    style={styles.serviceLogoImageFull}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>Pronote</Text>
                                            <Text style={styles.serviceSubtitle}>Bientôt disponible</Text>
                                        </View>
                                        <View style={styles.arrowContainer}>
                                            <ChevronRight size={18} color="#6B7280" />
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.disabledCard]}
                                        activeOpacity={0.9}
                                        onPress={() => Alert.alert("Bientôt disponible", "L'intégration Skolengo est en cours de développement.")}
                                    >
                                        <View style={styles.serviceIconContainer}>
                                            <View style={styles.logoContainerTransparent}>
                                                <Image
                                                    source={require('../../../assets/logo-skolengo.png')}
                                                    style={styles.serviceLogoImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>Skolengo</Text>
                                            <Text style={styles.serviceSubtitle}>Bientôt disponible</Text>
                                        </View>
                                        <ChevronRight size={18} color="#6B7280" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.cardActive]}
                                        activeOpacity={0.8}
                                        onPress={() => handleServiceSelect('ent')}
                                    >
                                        <View style={styles.serviceIconContainer}>
                                            <View style={[styles.logoContainerTransparent, { backgroundColor: 'transparent', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
                                                <School size={24} color="#3B82F6" />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>Espaces Numériques (ENT)</Text>
                                            <Text style={styles.serviceSubtitle}>Skolengo et autres...</Text>
                                        </View>
                                        <ChevronRight size={18} color="#6B7280" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.cardActive]}
                                        activeOpacity={0.8}
                                        onPress={() => handleServiceSelect('restauration')}
                                    >
                                        <View style={styles.serviceIconContainer}>
                                            <View style={[styles.logoContainerTransparent, { backgroundColor: 'transparent', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
                                                <Utensils size={24} color="#EF4444" />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>Restauration scolaire</Text>
                                            <Text style={styles.serviceSubtitle}>TurboSelf, Alise, Izly...</Text>
                                        </View>
                                        <ChevronRight size={18} color="#6B7280" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.serviceCard, styles.cardActive]}
                                        activeOpacity={0.8}
                                        onPress={() => handleServiceSelect('universitaire')}
                                    >
                                        <View style={styles.serviceIconContainer}>
                                            <View style={[styles.logoContainerTransparent, { backgroundColor: 'transparent', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
                                                <GraduationCap size={24} color="#A855F7" />
                                            </View>
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>Services Universitaires</Text>
                                            <Text style={styles.serviceSubtitle}>Sorbonne, Limoges, Lorraine...</Text>
                                        </View>
                                        <ChevronRight size={18} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.subServicesGrid}>
                                    {SUB_CATEGORIES[activeCategory].map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[styles.subServiceCard, item.disabled ? { opacity: 0.6 } : styles.cardActive]}
                                            activeOpacity={item.disabled ? 0.9 : 0.7}
                                            onPress={() => item.disabled ? Alert.alert("Bientôt disponible", `${item.name} est en cours de développement.`) : handleServiceSelect(item.id)}
                                        >
                                            <View style={styles.subServiceLogoContainer}>
                                                <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: (item.id === 'turboself' || item.id === 'alise' || item.id === 'ard') ? 8 : 0 }}>
                                                    <Image
                                                        source={item.logo}
                                                        style={styles.serviceLogoImage}
                                                        resizeMode="contain"
                                                    />
                                                </View>
                                            </View>
                                            <Text style={styles.subServiceName} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.subServiceSubtitle} numberOfLines={1}>{item.disabled ? 'Bientôt disponible' : item.subtitle}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </ScrollView>

                        {/* Help / Fallback Section */}
                        <View style={styles.helpSection}>
                            <View style={styles.helpDivider} />
                            <Text style={styles.helpTitle}>UN PROBLÈME DE CONNEXION ?</Text>
                            <TouchableOpacity
                                style={styles.helpButton}
                                onPress={handleBugReport}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.helpIconBox}>
                                    <Bug size={18} color="#A855F7" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.helpButtonText}>Obtenir de l'aide ou signaler un incident</Text>
                                    <Text style={styles.helpButtonSubtext}>Nous sommes là pour vous aider</Text>
                                </View>
                                <ChevronRight size={16} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        {/* Footer inside Bottom Sheet */}
                        <View style={styles.bottomSheetFooter}>
                            <TouchableOpacity onPress={handleOpenPrivacy}>
                                <Text style={styles.footerLink}>Confidentialité</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleGitHub}>
                                <Text style={styles.footerLink}>GitHub</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleOpenContact}>
                                <Text style={styles.footerLink}>Contact</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )
            }

            {/* Login Form */}
            {
                selectedService && (
                    <Animated.View
                        style={[
                            styles.loginForm,
                            {
                                transform: [
                                    { translateY: loginFormSlide },
                                    { translateY: keyboardOffset }
                                ],
                            },
                        ]}
                    >
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={{ width: '100%' }}
                            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                        >
                            <View style={styles.loginFormHandle} />

                            <Text style={styles.loginFormTitle}>
                                {selectedService === 'ecoledirecte' ? 'ECOLEDIRECTE' :
                                    (() => {
                                        for (const cat in SUB_CATEGORIES) {
                                            const found = SUB_CATEGORIES[cat].find(s => s.id === selectedService);
                                            if (found) return found.name.toUpperCase();
                                        }
                                        return 'CONNEXION';
                                    })()}
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Identifiant</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={{ marginRight: 15, opacity: 0.6 }}>
                                        <User size={20} color="#A855F7" />
                                    </View>
                                    <TextInput
                                        style={styles.inputText}
                                        placeholder="Nom d'utilisateur"
                                        placeholderTextColor="#64748B"
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        onFocus={() => {
                                            Animated.timing(keyboardOffset, {
                                                toValue: -280,
                                                duration: 250,
                                                useNativeDriver: true,
                                            }).start();
                                        }}
                                        onBlur={() => {
                                            Animated.timing(keyboardOffset, {
                                                toValue: 0,
                                                duration: 250,
                                                useNativeDriver: true,
                                            }).start();
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Mot de passe</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={{ marginRight: 15, opacity: 0.6 }}>
                                        <Lock size={20} color="#A855F7" />
                                    </View>
                                    <TextInput
                                        style={styles.inputText}
                                        placeholder="Mot de passe"
                                        placeholderTextColor="#64748B"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!isPasswordVisible}
                                        onFocus={() => {
                                            Animated.timing(keyboardOffset, {
                                                toValue: -280,
                                                duration: 250,
                                                useNativeDriver: true,
                                            }).start();
                                        }}
                                        onBlur={() => {
                                            Animated.timing(keyboardOffset, {
                                                toValue: 0,
                                                duration: 250,
                                                useNativeDriver: true,
                                            }).start();
                                        }}
                                    />
                                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ padding: 4 }}>
                                        {isPasswordVisible ?
                                            <EyeOff size={22} color="#94A3B8" /> :
                                            <Eye size={22} color="#94A3B8" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.loginButton}
                                activeOpacity={0.8}
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                <LinearGradient
                                    colors={['#A855F7', '#3B82F6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.loginButtonGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.loginButtonText}>Se connecter</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.loginDisclaimer}>
                                Vos identifiants sont envoyés directement à EcoleDirecte via une connexion sécurisée.
                            </Text>
                        </KeyboardAvoidingView>
                    </Animated.View>
                )
            }


            {/* 2FA Modal */}
            {
                is2FAVisible && (
                    <View style={[StyleSheet.absoluteFill, { zIndex: 100, alignItems: 'center', justifyContent: 'center' }]}>
                        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
                        <View style={{
                            width: '90%',
                            maxHeight: '85%',
                            backgroundColor: '#121128',
                            borderRadius: 25,
                            borderWidth: 1,
                            borderColor: 'rgba(168, 85, 247, 0.3)',
                            padding: 24,
                            shadowColor: "#A855F7",
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.5,
                            shadowRadius: 30,
                            elevation: 20
                        }}>
                            <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 20 }}>VÉRIFICATION</Text>

                            <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: 15, borderRadius: 12, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#A855F7' }}>
                                <Text style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 20 }}>Sécurité renforcée : Veuillez répondre à la question secrète pour confirmer votre identité.</Text>
                            </View>

                            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
                                {twoFAQuestion}
                            </Text>

                            <ScrollView style={{ flexGrow: 0, marginBottom: 20 }}>
                                {twoFAOptions.map((option, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        activeOpacity={0.7}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            padding: 16,
                                            backgroundColor: selected2FAIndex === index ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                            marginBottom: 10,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selected2FAIndex === index ? '#A855F7' : 'rgba(255,255,255,0.1)'
                                        }}
                                        onPress={() => setSelected2FAIndex(index)}
                                    >
                                        {selected2FAIndex === index ?
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#A855F7', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' }} />
                                            </View>
                                            :
                                            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#6B7280', marginRight: 15 }} />
                                        }
                                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: selected2FAIndex === index ? 'bold' : 'normal' }}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#A855F7',
                                    paddingVertical: 16,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    marginTop: 10,
                                    opacity: selected2FAIndex !== -1 ? 1 : 0.5
                                }}
                                onPress={submit2FA}
                                disabled={isLoading}
                            >
                                <LinearGradient
                                    colors={['#A855F7', '#3B82F6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 16, opacity: 0.8 }]}
                                />
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', zIndex: 1 }}>Valider</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }



        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 80,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
    },
    logo: {
        width: 160,
        height: 160,
    },
    title: {
        fontSize: 38,
        fontFamily: 'Text-Bold',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 1.5,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Text-Medium',
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 10,
        opacity: 0.8,
    },
    tagsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 35,
        gap: 12,
    },
    tag: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    tagText: {
        color: '#E2E8F0',
        fontSize: 13,
        fontFamily: 'Text-Bold',
    },
    buttonWrapper: {
        marginTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waveLayer: {
        position: 'absolute',
        width: 220,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
    },
    commencerButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingHorizontal: 54,
        paddingVertical: 18,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    commencerButtonText: {
        color: '#0F111E',
        fontSize: 18,
        fontFamily: 'Text-Bold',
        letterSpacing: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
    },
    footerLink: {
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'Text-Medium',
        opacity: 0.7,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#121128',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingTop: 12,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.4)', // Slightly more visible glow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -20 },
        shadowOpacity: 0.8,
        shadowRadius: 35,
        elevation: 30,
        zIndex: 20,
    },
    bottomSheetHandle: {
        width: 50,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 30,
    },
    bottomSheetTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Text-Bold',
        letterSpacing: 4,
        marginBottom: 30,
        textAlign: 'center',
        opacity: 0.9,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Text-Bold',
        letterSpacing: 2,
    },
    servicesScroll: {
        maxHeight: height * 0.5,
        marginBottom: 10,
    },
    servicesGrid: {
        gap: 16,
        paddingBottom: 10,
    },
    subServicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 20,
    },
    subServiceCard: {
        width: (width - 48 - 12) / 2, // 2 columns minus gap
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 4,
    },
    subServiceLogoContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    subServiceName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Text-Bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    subServiceSubtitle: {
        color: '#64748B',
        fontSize: 11,
        fontFamily: 'Text-Medium',
        textAlign: 'center',
    },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    cardActive: {
        borderColor: 'rgba(139, 92, 246, 0.4)',
    },
    disabledCard: {
        opacity: 0.5,
    },
    serviceIconContainer: {
        marginRight: 18,
    },
    logoContainerWhite: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 6,
    },
    logoContainerTransparent: {
        width: 52,
        height: 52,
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceLogoImage: {
        width: '100%',
        height: '100%',
    },
    serviceLogoImageFull: {
        width: '100%',
        height: '100%',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: 'Text-Bold',
        marginBottom: 3,
    },
    serviceSubtitle: {
        color: '#94A3B8',
        fontSize: 13,
        fontFamily: 'Text-Medium',
    },
    arrowContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },

    helpSection: {
        marginTop: 30,
    },
    helpDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
    },
    helpTitle: {
        color: '#64748B',
        fontSize: 10,
        fontFamily: 'Text-Bold',
        letterSpacing: 1.5,
        marginBottom: 12,
        textAlign: 'center',
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    helpIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    helpButtonText: {
        color: '#E2E8F0',
        fontSize: 14,
        fontFamily: 'Text-Bold',
        marginBottom: 2,
    },
    helpButtonSubtext: {
        color: '#64748B',
        fontSize: 12,
        fontFamily: 'Text-Medium',
    },

    bottomSheetFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },

    loginForm: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#121128', // Branded darker purple
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        paddingTop: 12,
        paddingBottom: 40,
        paddingHorizontal: 28,
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(168, 85, 247, 0.5)', // Neon glow effect
        shadowColor: "#A855F7",
        shadowOffset: { width: 0, height: -15 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 35,
        zIndex: 20,
    },
    loginFormHandle: {
        width: 50,
        height: 6,
        backgroundColor: 'rgba(168, 85, 247, 0.25)',
        borderRadius: 10,
        alignSelf: 'center',
        marginBottom: 30,
    },
    loginFormTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Text-Bold',
        letterSpacing: 4,
        marginBottom: 40,
        textAlign: 'center',
        opacity: 0.9,
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 12,
        fontFamily: 'Text-Bold',
        marginBottom: 12,
        marginLeft: 6,
        letterSpacing: 0.5,
        opacity: 0.8,
    },
    inputWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 22, // More rounded
        paddingHorizontal: 22,
        height: 64, // Slightly taller
        borderWidth: 1.5,
        borderColor: 'rgba(139, 92, 246, 0.25)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Text-Medium',
    },
    loginButton: {
        marginTop: 15,
        marginBottom: 25,
        borderRadius: 24,
        overflow: 'hidden',
        height: 64,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    loginButtonGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: 'Text-Bold',
        letterSpacing: 0.5,
    },
    loginDisclaimer: {
        color: '#475569',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    privacyScroll: {
        marginTop: 10,
        marginBottom: 20,
    },
    privacyContent: {
        paddingBottom: 40,
    },
    privacyText: {
        color: '#94A3B8',
        fontSize: 14,
        lineHeight: 22,
    },
    privacySectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 8,
    },
});
