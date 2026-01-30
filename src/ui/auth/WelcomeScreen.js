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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Bug, Mail, ChevronRight, MoreHorizontal, Check, Circle, Eye, EyeOff } from 'lucide-react-native';
import EcoleDirecteApi from '../../services/EcoleDirecteApi';
import AccountHandler from '../../core/AccountHandler';
import { useGlobalAppContext } from '../../util/GlobalAppContext';


const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
    const { setIsLoggedIn } = useGlobalAppContext();
    const [showConnectionOptions, setShowConnectionOptions] = useState(false);
    const [selectedService, setSelectedService] = useState(null);

    // Animations
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const tagsOpacity = useRef(new Animated.Value(0)).current;
    const buttonSlide = useRef(new Animated.Value(50)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const bottomSheetSlide = useRef(new Animated.Value(height)).current;
    const loginFormSlide = useRef(new Animated.Value(height)).current;
    const privacySlide = useRef(new Animated.Value(height)).current;
    const contactSlide = useRef(new Animated.Value(height)).current;
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showContact, setShowContact] = useState(false);

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
        } else if (status === 3) { // 2FA requis (Géré par DoubleAuthPopup global)
            console.log("[WelcomeScreen] 2FA required, gloabl popup should open");
            return;
        } else if (status === 0) { // Mauvais mot de passe
            Alert.alert("Erreur", "Identifiant ou mot de passe incorrect.");
        } else { // Erreur serveur
            Alert.alert("Erreur", "Une erreur est survenue lors de la connexion.");
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
        setShowPrivacy(true);
        Animated.spring(privacySlide, {
            toValue: 0,
            tension: 50,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleClosePrivacy = () => {
        Animated.timing(privacySlide, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setShowPrivacy(false));
    };

    const handleGitHub = () => {
        Linking.openURL('https://github.com/Dontbyshai/NotiaNote');
    };

    const handleOpenContact = () => {
        setShowContact(true);
        Animated.spring(contactSlide, {
            toValue: 0,
            tension: 50,
            friction: 10,
            useNativeDriver: true,
        }).start();
    };

    const handleCloseContact = () => {
        Animated.timing(contactSlide, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setShowContact(false));
    };

    const handleBugReport = () => {
        const subject = "Signalement de bug NotiaNote";
        const body = `Bonjour,\n\nJe souhaite signaler un bug sur NotiaNote.\n\nDescription du problème :\n(Décrivez votre problème ici)\n\nInformations techniques :\nAppareil : ${Platform.OS} ${Platform.Version}\nNotiaNote Version : 1.0.0`;
        const url = `mailto:dontbyshai@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(url);
    };

    const handleContactMail = () => {
        Linking.openURL('mailto:dontbyshai@gmail.com?subject=Contact NotiaNote');
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
            {/* Simple Dark Gradient Background */}
            <LinearGradient
                colors={['#0F111E', '#1A1B2E', '#151725']}
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
                {/* Commencer Button with pulse glow */}
                <Animated.View
                    style={[
                        styles.buttonWrapper,
                        {
                            opacity: buttonOpacity,
                            transform: [
                                { translateY: buttonSlide },
                                { scale: buttonPulse } // Breathing effect sur tout le wrapper
                            ],
                        },
                    ]}
                    pointerEvents={showConnectionOptions ? 'none' : 'auto'}
                >
                    {/* Shockwave Layers (Echos) */}
                    <Animated.View
                        style={[
                            styles.waveLayer, // Style de base (forme, couleur)
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
                showConnectionOptions && (
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

                        <Text style={styles.bottomSheetTitle}>CONNEXION</Text>

                        <TouchableOpacity
                            style={[styles.serviceCard, styles.cardActive]}
                            onPress={() => handleServiceSelect('ecoledirecte')}
                            activeOpacity={0.7}
                        >
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
                                <Text style={styles.serviceSubtitle}>Compte Élève ou Parent</Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <Text style={styles.arrowText}>→</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.serviceCard, styles.disabledCard]}
                            activeOpacity={0.7}
                            onPress={() => handleServiceSelect('pronote')}
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
                                <Text style={styles.serviceSubtitle}>Indisponible pour le moment</Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <Text style={styles.arrowText}>→</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.serviceCard, styles.disabledCard]}
                            activeOpacity={0.7}
                            onPress={() => handleServiceSelect('autre')}
                        >
                            <View style={styles.serviceIconContainer}>
                                <View style={[styles.logoContainerTransparent, { backgroundColor: '#4B5563' }]}>
                                    <MoreHorizontal size={24} color="#FFFFFF" />
                                </View>
                            </View>
                            <View style={styles.serviceInfo}>
                                <Text style={styles.serviceName}>Autre</Text>
                                <Text style={styles.serviceSubtitle}>Autre plateforme</Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <Text style={styles.arrowText}>→</Text>
                            </View>
                        </TouchableOpacity>

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
                                transform: [{ translateY: loginFormSlide }],
                            },
                        ]}
                    >


                        <View style={styles.loginFormHandle} />

                        <Text style={styles.loginFormTitle}>{selectedService === 'ecoledirecte' ? 'ECOLEDIRECTE' : 'CONNEXION'}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Identifiant</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.inputText}
                                    placeholder="Nom d'utilisateur"
                                    placeholderTextColor="#6B7280"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Mot de passe</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.inputText}
                                    placeholder="Mot de passe"
                                    placeholderTextColor="#6B7280"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                />
                                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ padding: 4 }}>
                                    {isPasswordVisible ?
                                        <EyeOff size={20} color="#9CA3AF" /> :
                                        <Eye size={20} color="#9CA3AF" />
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
                    </Animated.View>
                )
            }

            {/* Privacy Bottom Sheet */}
            {
                showPrivacy && (
                    <TouchableWithoutFeedback onPress={handleClosePrivacy}>
                        <View style={styles.backdrop} />
                    </TouchableWithoutFeedback>
                )
            }
            {
                showPrivacy && (
                    <Animated.View
                        style={[
                            styles.bottomSheet,
                            {
                                height: '85%',
                                transform: [{ translateY: privacySlide }],
                            },
                        ]}
                    >
                        <View style={styles.bottomSheetHandle} />
                        <Text style={styles.bottomSheetTitle}>POLITIQUE DE CONFIDENTIALITÉ</Text>

                        <ScrollView style={styles.privacyScroll} contentContainerStyle={styles.privacyContent}>
                            <Text style={styles.privacyText}>
                                <Text style={styles.privacySectionTitle}>Dernière mise à jour : 26 novembre 2025{'\n\n'}</Text>

                                <Text style={styles.privacySectionTitle}>1. Introduction{'\n'}</Text>
                                NotiaNote est un service gratuit et open source qui vous permet d'accéder à vos données EcoleDirecte avec une interface moderne et améliorée. Nous prenons votre vie privée très au sérieux.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>2. Collecte de données{'\n'}</Text>
                                NotiaNote ne collecte AUCUNE donnée personnelle. Nous ne stockons pas vos identifiants, vos notes, vos devoirs ou toute autre information vous concernant sur nos serveurs.{'\n'}
                                Toutes vos données sont stockées localement dans votre navigateur et ne sont jamais transmises à nos serveurs. Nous utilisons uniquement l'API officielle d'EcoleDirecte pour récupérer vos informations.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>3. Utilisation de l'API EcoleDirecte{'\n'}</Text>
                                NotiaNote utilise l'API officielle d'EcoleDirecte pour récupérer vos données scolaires. Vos identifiants sont transmis directement à EcoleDirecte via une connexion sécurisée (HTTPS).{'\n'}
                                Nous ne sommes pas affiliés à Aplim (éditeur d'EcoleDirecte) et n'avons aucun accès privilégié à leurs systèmes.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>4. Stockage local{'\n'}</Text>
                                Les données suivantes sont stockées localement dans votre navigateur :{'\n'}
                                - Vos préférences d'affichage (thème, mode d'affichage){'\n'}
                                - Votre token de session EcoleDirecte (pour rester connecté){'\n'}
                                - Un cache temporaire de vos données scolaires (notes, devoirs, etc.){'\n'}
                                Vous pouvez supprimer ces données à tout moment en vous déconnectant ou en vidant le cache de votre navigateur.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>5. Cookies et Publicité{'\n'}</Text>
                                NotiaNote utilise le stockage local du navigateur (localStorage) pour sauvegarder vos préférences.{'\n'}
                                Publicité : Pour financer le développement et l'hébergement de NotiaNote, nous affichons des publicités non intrusives. Ces publicités peuvent utiliser des cookies de tiers pour personnaliser le contenu publicitaire. Vous pouvez désactiver ces cookies dans les paramètres de votre navigateur.{'\n'}
                                Nous ne vendons jamais vos données personnelles à des tiers. Les publicités sont gérées par des réseaux publicitaires tiers qui respectent les normes de confidentialité.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>6. Sécurité{'\n'}</Text>
                                Nous prenons la sécurité de vos données très au sérieux :{'\n'}
                                - Toutes les communications avec EcoleDirecte sont chiffrées (HTTPS){'\n'}
                                - Vos identifiants ne sont jamais stockés en clair{'\n'}
                                - Le code source est open source et auditable sur GitHub{'\n'}
                                - Nous ne collectons aucune donnée analytique ou de télémétrie{'\n\n'}

                                <Text style={styles.privacySectionTitle}>7. Open Source{'\n'}</Text>
                                NotiaNote est un projet open source distribué sous licence MIT. Le code source complet est disponible sur GitHub. Vous pouvez l'auditer, le modifier et contribuer au projet.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>8. Signalement de bugs{'\n'}</Text>
                                Si vous découvrez un bug ou une faille de sécurité, veuillez nous contacter à l'adresse :{'\n'}
                                dontbyshai@gmail.com{'\n\n'}

                                <Text style={styles.privacySectionTitle}>9. Modifications de cette politique{'\n'}</Text>
                                Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec une nouvelle date de mise à jour.{'\n\n'}

                                <Text style={styles.privacySectionTitle}>10. Contact{'\n'}</Text>
                                Pour toute question concernant cette politique de confidentialité, vous pouvez nous contacter à :{'\n'}
                                dontbyshai@gmail.com
                            </Text>
                        </ScrollView>
                    </Animated.View>
                )
            }

            {/* Contact Bottom Sheet */}
            {
                showContact && (
                    <TouchableWithoutFeedback onPress={handleCloseContact}>
                        <View style={styles.backdrop} />
                    </TouchableWithoutFeedback>
                )
            }
            {
                showContact && (
                    <Animated.View
                        style={[
                            styles.bottomSheet,
                            {
                                height: '70%',
                                transform: [{ translateY: contactSlide }],
                            },
                        ]}
                    >
                        <View style={styles.bottomSheetHandle} />
                        <Text style={styles.bottomSheetTitle}>CONTACT & AIDE</Text>

                        <ScrollView style={styles.privacyScroll} contentContainerStyle={styles.privacyContent}>
                            <Text style={styles.privacySectionTitle}>Un problème ?</Text>
                            <TouchableOpacity
                                style={[styles.serviceCard, { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
                                onPress={handleBugReport}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Bug size={24} color="#EF4444" />
                                </View>
                                <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>Signaler un bug</Text>
                                    <Text style={styles.serviceSubtitle}>L'application rencontre un problème ?</Text>
                                </View>
                                <View style={[styles.arrowContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <ChevronRight size={20} color="#EF4444" />
                                </View>
                            </TouchableOpacity>

                            <Text style={styles.privacySectionTitle}>Nous contacter</Text>
                            <TouchableOpacity
                                style={styles.serviceCard}
                                onPress={handleContactMail}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                    <Mail size={24} color="#3B82F6" />
                                </View>
                                <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>Envoyer un email</Text>
                                    <Text style={styles.serviceSubtitle}>Une question ou une suggestion ?</Text>
                                </View>
                                <View style={styles.arrowContainer}>
                                    <ChevronRight size={20} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                )
            }

            {/* 2FA Modal */}
            {is2FAVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100, alignItems: 'center', justifyContent: 'center' }]}>
                    <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
                    <View style={{
                        width: '90%',
                        maxHeight: '85%',
                        backgroundColor: '#131524',
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
            )}



        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
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
        paddingBottom: 100, // Space for footer
    },
    glowContainer: {
        position: 'absolute',
        alignSelf: 'center',
    },
    blurView: {
        width: 300,
        height: 300,
        borderRadius: 150,
        overflow: 'hidden',
    },
    glow: {
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#8B5CF6',
        opacity: 0.4,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 140,
        height: 140,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: 15,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 15,
        color: '#A0AEC0',
        textAlign: 'center',
        marginTop: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 25,
        gap: 10,
    },
    tag: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    tagText: {
        color: '#C4B5FD',
        fontSize: 13,
        fontWeight: '600',
    },
    buttonWrapper: {
        marginTop: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    waveLayer: {
        position: 'absolute',
        width: 210, // Un peu plus large que le bouton
        height: 58, // Un peu plus haut
        borderRadius: 29, // Arrondi max
        backgroundColor: '#FFFFFF',
    },
    commencerButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 25,
        paddingHorizontal: 50,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    commencerButtonText: {
        color: '#1a1a2e',
        fontSize: 17,
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 25,
    },
    footerLink: {
        color: '#718096',
        fontSize: 13,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent', // Invisible mais cliquable
        zIndex: 10,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#131524', // Harmonisé avec bottomSheet
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingTop: 15,
        paddingBottom: 35, // Encore réduit pour resserrer le bas
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        zIndex: 20, // Au-dessus du backdrop
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // Handle plus subtil
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    bottomSheetTitle: {
        color: '#A0AEC0', // Texte plus clair
        fontSize: 12,
        fontWeight: 'bold', // Plus gras
        letterSpacing: 2,
        marginBottom: 20,
        marginLeft: 5,
    },
    bottomSheetFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 25,
        marginTop: 20, // Espace haut réduit
        opacity: 0.8,
    },

    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 30, 50, 0.6)',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    cardActive: {
        borderColor: '#7c3aed', // Violet plus vif pour la carte active
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    disabledCard: {
        opacity: 0.6,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(20, 20, 30, 0.4)',
    },
    serviceIconContainer: {
        marginRight: 16,
    },
    logoContainerWhite: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        padding: 4,
    },
    logoContainerTransparent: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
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
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    serviceSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
    },
    arrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    arrowText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '600',
    },
    loginForm: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#131524', // Harmonisé avec bottomSheet
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.3)',
        zIndex: 20, // Au-dessus du backdrop
    },
    backButton: {
        position: 'absolute',
        top: 30,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
    },
    loginFormHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#4B5563',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 30,
    },
    loginFormTitle: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 30,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 8,
        paddingLeft: 5,
    },
    inputWrapper: {
        backgroundColor: 'rgba(31, 41, 55, 0.8)',
        borderRadius: 15,
        paddingHorizontal: 18,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        height: '100%',
    },
    inputPlaceholder: {
        color: '#6B7280',
        fontSize: 16,
    },
    loginButton: {
        marginTop: 20,
        marginBottom: 20,
        borderRadius: 25,
        overflow: 'hidden',
    },
    loginButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginDisclaimer: {
        color: '#6B7280',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    privacyScroll: {
        marginTop: 10,
        marginBottom: 20,
    },
    privacyContent: {
        paddingBottom: 40,
    },
    privacyText: {
        color: '#A0AEC0',
        fontSize: 14,
        lineHeight: 22,
    },
    privacySectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 5,
    },


});
