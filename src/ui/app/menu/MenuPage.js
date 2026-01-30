import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Settings, RefreshCw, Wifi, CheckCircle, User, Bell, Moon, Sun,
    Shield, Info, LogOut, ChevronRight, Mail, Calendar, BookOpen,
    BarChart3, Palette, Globe
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import AccountHandler from '../../../core/AccountHandler';

function MenuPage() {
    const insets = useSafeAreaInsets();
    const { accountID } = useCurrentAccountContext();
    const [accountData, setAccountData] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [checking, setChecking] = useState(false);

    // Settings states
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);

    useEffect(() => {
        loadAccountInfo();
        checkConnection(false);
    }, [accountID]);

    const loadAccountInfo = async () => {
        try {
            const account = await AccountHandler.getMainAccount();
            if (account) setAccountData(account);
        } catch (e) {
            console.log("Error loading account", e);
        }
    };

    const checkConnection = async (forceReload = false) => {
        setChecking(true);
        if (!forceReload) setConnectionStatus('checking');

        try {
            const status = await AccountHandler.refreshLogin();
            if (status === 1) {
                setConnectionStatus('connected');
                if (forceReload) Alert.alert("Données rechargées", "La connexion est active et les données ont été actualisées.");
            } else {
                setConnectionStatus('disconnected');
                if (forceReload) Alert.alert("Erreur", "Connexion échouée.");
            }
        } catch (e) {
            console.error(e);
            setConnectionStatus('disconnected');
            if (forceReload) Alert.alert("Erreur", "Erreur technique lors de la connexion.");
        } finally {
            setChecking(false);
        }
    };

    const SettingsItem = ({ icon: Icon, title, subtitle, onPress, rightElement, color = '#8B5CF6' }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                flexDirection: 'row',
                alignItems: 'center',
            }}
        >
            <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${color}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
            }}>
                <Icon color={color} size={20} />
            </View>

            <View style={{ flex: 1 }}>
                <Text style={{ color: '#F8FAFC', fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {rightElement || <ChevronRight color="#64748B" size={20} />}
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }) => (
        <Text style={{
            color: '#94A3B8',
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginTop: 24,
            marginBottom: 12,
            marginLeft: 4
        }}>
            {title}
        </Text>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#020617' }}>
            <LinearGradient
                colors={['#1e1b4b', '#020617', '#020617']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />

            {/* Header */}
            <View style={{
                paddingTop: insets.top + 20,
                paddingHorizontal: 20,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.05)'
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={{ color: '#F8FAFC', fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>
                            Menu
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 14 }}>
                            Paramètres et préférences
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => checkConnection(true)}
                        disabled={checking}
                        style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            padding: 12,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        {checking ? (
                            <ActivityIndicator color="#8B5CF6" size="small" />
                        ) : (
                            <RefreshCw color="#8B5CF6" size={20} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* User Profile Card */}
                {accountData && (
                    <View style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 24,
                        borderWidth: 1,
                        borderColor: 'rgba(139, 92, 246, 0.2)',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 60,
                                height: 60,
                                borderRadius: 30,
                                backgroundColor: '#8B5CF6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 16
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>
                                    {(accountData.firstName || accountData.username || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                                    {accountData.firstName || accountData.username || 'Utilisateur'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {connectionStatus === 'connected' ? (
                                        <>
                                            <CheckCircle color="#4ADE80" size={14} style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#4ADE80', fontSize: 13, fontWeight: '600' }}>
                                                Connecté
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Wifi color="#94A3B8" size={14} style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                                                {checking ? "Vérification..." : "Hors ligne"}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick Actions */}
                <SectionHeader title="Actions rapides" />

                <SettingsItem
                    icon={RefreshCw}
                    title="Actualiser les données"
                    subtitle="Synchroniser avec EcoleDirecte"
                    onPress={() => checkConnection(true)}
                    color="#3B82F6"
                    rightElement={checking ? <ActivityIndicator color="#3B82F6" size="small" /> : undefined}
                />

                <SettingsItem
                    icon={Wifi}
                    title="Tester la connexion"
                    subtitle={connectionStatus === 'connected' ? "Connexion active" : "Vérifier l'état"}
                    onPress={() => checkConnection(false)}
                    color="#10B981"
                />

                {/* Appearance */}
                <SectionHeader title="Apparence" />

                <SettingsItem
                    icon={darkMode ? Moon : Sun}
                    title="Mode sombre"
                    subtitle="Thème de l'application"
                    color="#F59E0B"
                    rightElement={
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: '#64748B', true: '#8B5CF6' }}
                            thumbColor={darkMode ? '#F8FAFC' : '#CBD5E1'}
                        />
                    }
                />

                <SettingsItem
                    icon={Palette}
                    title="Thème"
                    subtitle="Personnaliser les couleurs"
                    onPress={() => Alert.alert("Thème", "Fonctionnalité à venir")}
                    color="#EC4899"
                />

                {/* Notifications */}
                <SectionHeader title="Notifications" />

                <SettingsItem
                    icon={Bell}
                    title="Notifications"
                    subtitle="Alertes et rappels"
                    color="#8B5CF6"
                    rightElement={
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: '#64748B', true: '#8B5CF6' }}
                            thumbColor={notifications ? '#F8FAFC' : '#CBD5E1'}
                        />
                    }
                />

                <SettingsItem
                    icon={Mail}
                    title="Notifications de messages"
                    subtitle="Recevoir les nouveaux messages"
                    onPress={() => Alert.alert("Messages", "Fonctionnalité à venir")}
                    color="#3B82F6"
                />

                <SettingsItem
                    icon={Calendar}
                    title="Rappels de devoirs"
                    subtitle="Ne manquez aucune échéance"
                    onPress={() => Alert.alert("Devoirs", "Fonctionnalité à venir")}
                    color="#F59E0B"
                />

                {/* About */}
                <SectionHeader title="À propos" />

                <SettingsItem
                    icon={Info}
                    title="À propos de NotiaNote"
                    subtitle="Version 1.0.0"
                    onPress={() => Alert.alert("NotiaNote", "Application mobile pour EcoleDirecte\nVersion 1.0.0")}
                    color="#06B6D4"
                />

                <SettingsItem
                    icon={Shield}
                    title="Confidentialité"
                    subtitle="Politique de confidentialité"
                    onPress={() => Alert.alert("Confidentialité", "Vos données sont sécurisées")}
                    color="#10B981"
                />

                <SettingsItem
                    icon={Globe}
                    title="Langue"
                    subtitle="Français"
                    onPress={() => Alert.alert("Langue", "Fonctionnalité à venir")}
                    color="#8B5CF6"
                />

                {/* Logout */}
                <TouchableOpacity
                    onPress={() => Alert.alert(
                        "Déconnexion",
                        "Êtes-vous sûr de vouloir vous déconnecter ?",
                        [
                            { text: "Annuler", style: "cancel" },
                            { text: "Déconnexion", style: "destructive" }
                        ]
                    )}
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 16,
                        padding: 16,
                        marginTop: 24,
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <LogOut color="#EF4444" size={20} style={{ marginRight: 8 }} />
                    <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>
                        Se déconnecter
                    </Text>
                </TouchableOpacity>

                {/* Footer */}
                <Text style={{
                    color: '#64748B',
                    fontSize: 12,
                    textAlign: 'center',
                    marginTop: 32
                }}>
                    NotiaNote © 2026{'\n'}
                    Fait avec ❤️ pour les étudiants
                </Text>
            </ScrollView>
        </View>
    );
}

export default MenuPage;
