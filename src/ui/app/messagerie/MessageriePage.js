import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions, Alert, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ChevronLeft, Mail, Search, Paperclip, Plus, Folder, FolderOpen, MailOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import EcoleDirecteApi from '../../../services/EcoleDirecteApi';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { BlurView } from 'expo-blur';
import BannerAdComponent from '../../components/Ads/BannerAdComponent';

// Helper for date
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday ?
        date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) :
        date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function MessageriePage() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { accountID: contextAccountID, mainAccount } = useCurrentAccountContext();
    // Fix: Calculate effective ID to handle cases where contextAccountID is undefined
    const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);

    const { theme } = useGlobalAppContext();

    const [messages, setMessages] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(0); // 0 = Inbox/Reçus

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Folder Modal
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);

    const loadData = async (folderId = selectedFolderId) => {
        try {
            setRefreshing(true);
            const response = await EcoleDirecteApi.getMessages(accountID, 'received', folderId);

            if (response.status === 200 && response.data?.data) {
                // Messages
                if (response.data.data.messages && response.data.data.messages.received) {
                    const rawMessages = response.data.data.messages.received;
                    // Inject ADs every 8 messages
                    const messagesWithAds = [];
                    rawMessages.forEach((msg, index) => {
                        messagesWithAds.push(msg);
                        if ((index + 1) % 8 === 0) {
                            messagesWithAds.push({ id: `ad-${index}`, isAd: true });
                        }
                    });
                    setMessages(messagesWithAds);
                } else {
                    setMessages([]); // Empty folder?
                }

                // Folders (Classeurs)
                if (response.data.data.classeurs) {
                    setFolders(response.data.data.classeurs);
                }
            } else {
                console.warn("Messages fetch failed:", response.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadData(selectedFolderId);
        }
    }, [isFocused, accountID]); // Don't add selectedFolderId here to avoid loop if loadData changes it, but loadData doesn't.

    const changeFolder = (id) => {
        if (id === selectedFolderId) return;
        setSelectedFolderId(id);
        setLoading(true);
        loadData(id);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setCreatingFolder(true);
        try {
            const res = await EcoleDirecteApi.createMessageFolder(newFolderName.trim());
            if (res.status === 200) {
                setCreateModalVisible(false);
                setNewFolderName("");
                loadData(selectedFolderId); // Refresh to see new folder
                Alert.alert("Succès", "Dossier créé !");
            } else {
                Alert.alert("Erreur", "Impossible de créer le dossier.");
            }
        } catch (e) {
            Alert.alert("Erreur", "Une erreur est survenue.");
        } finally {
            setCreatingFolder(false);
        }
    };

    const renderItem = ({ item }) => {
        if (item.isAd) {
            return <BannerAdComponent placement="messages" />;
        }

        // Robust read check
        let isRead = false;
        if (item.read !== undefined) isRead = item.read;
        else if (item.lu !== undefined) isRead = item.lu;
        else if (item.mRead !== undefined) isRead = item.mRead;

        const subject = item.subject || item.objet || "Sans objet";
        const sender = item.from?.name || item.from?.nom || "Inconnu";
        const date = item.date;
        const files = item.files || item.pieces_jointes || [];
        const hasAttachment = files.length > 0;

        return (
            <TouchableOpacity
                style={[
                    styles.messageCard,
                    {
                        backgroundColor: Platform.select({
                            android: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                            ios: theme.dark ? 'transparent' : '#FFFFFF'
                        }),
                        borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        shadowOpacity: 0,
                        elevation: 0,
                    },
                    !isRead && { borderColor: 'rgba(59, 130, 246, 0.5)' } // Neutral blue border
                ]}
                onPress={() => navigation.navigate('MessageDetailsPage', { message: { ...item, files } })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    <LinearGradient
                        colors={!isRead ?
                            [theme.colors.primary, theme.colors.primary] :
                            (theme.dark ? ['rgba(255,255,255,0.1)', theme.colors.background] : ['#E2E8F0', '#CBD5E1'])
                        }
                        style={styles.avatar}
                    >
                        <Text style={[
                            styles.avatarText,
                            !isRead && theme.colors.primary === '#FAFAFA' && { color: '#000' },
                            isRead && !theme.dark && { color: '#475569' } // Dark text for read avatar in light mode
                        ]}>{sender.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                </View>

                <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                        <Text style={[styles.senderName, { color: theme.dark ? '#E2E8F0' : '#000000' }, !isRead && styles.unreadText && { color: theme.dark ? '#FFF' : '#000000' }]} numberOfLines={1}>{sender}</Text>
                        <Text style={[styles.dateText, { color: theme.dark ? '#94A3B8' : '#64748B' }]}>{formatDate(date)}</Text>
                    </View>
                    <Text style={[styles.subjectText, { color: theme.dark ? '#CBD5E1' : '#000000' }, !isRead && styles.unreadText && { color: theme.dark ? '#FFF' : '#000000' }]} numberOfLines={1}>{subject}</Text>
                    <View style={styles.subInfo}>
                        {/* Status Icon & Text */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 'auto' }}>
                            {isRead ? (
                                <>
                                    <MailOpen size={14} color="#64748B" style={{ marginRight: 4 }} />
                                    <Text style={{ color: '#64748B', fontSize: 13, marginRight: 10 }}>Lu</Text>
                                </>
                            ) : (
                                <>
                                    <Mail size={14} color="#3B82F6" fill="#3B82F6" style={{ marginRight: 4 }} />
                                    <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: 'bold', marginRight: 10 }}>Non lu</Text>
                                </>
                            )}
                        </View>

                        {hasAttachment && <Paperclip size={14} color="#94A3B8" style={{ marginLeft: 5 }} />}
                        {!isRead && <View style={[styles.unreadDot, { backgroundColor: '#3B82F6' }]} />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Galaxy Gradient matching CantinePage */}
            <LinearGradient colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ ...styles.iconButton, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                    <ChevronLeft color={theme.dark ? "#FFF" : theme.colors.onBackground} size={28} />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.onBackground }}>Messagerie</Text>
                <View style={{ flexDirection: 'row' }}>
                    {/* Pencil removed as requested ("elve ca") */}
                    {/* Replaced with simple search or nothing, kept Search for now */}
                    <TouchableOpacity style={{ ...styles.iconButton, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                        <Search color={theme.dark ? "#FFF" : theme.colors.onBackground} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Folder Bar (Horizontal Scroll) */}
            <View style={styles.folderBarContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderBar}>

                    {/* Default Inbox */}
                    <TouchableOpacity
                        style={[styles.folderChip, selectedFolderId === 0 && { backgroundColor: theme.colors.primary + '33', borderColor: theme.colors.primary }]}
                        onPress={() => changeFolder(0)}
                    >
                        <Mail color={selectedFolderId === 0 ? "#FFF" : "#94A3B8"} size={16} />
                        <Text style={[styles.folderChipText, selectedFolderId === 0 && (theme.dark ? styles.activeChipText : { color: theme.colors.primary })]}>Reçus</Text>
                    </TouchableOpacity>

                    {/* Dynamic Folders */}
                    {folders.map((folder) => (
                        <TouchableOpacity
                            key={folder.id}
                            style={[
                                styles.folderChip,
                                {
                                    backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
                                    borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                },
                                selectedFolderId === folder.id && { backgroundColor: theme.colors.primary + '33', borderColor: theme.colors.primary }
                            ]}
                            onPress={() => changeFolder(folder.id)}
                        >
                            {selectedFolderId === folder.id ? (
                                <FolderOpen color="#FFF" size={16} />
                            ) : (
                                <Folder color="#94A3B8" size={16} />
                            )}
                            <Text style={[styles.folderChipText, selectedFolderId === folder.id && (theme.dark ? styles.activeChipText : { color: theme.colors.primary })]}>
                                {folder.libelle}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    {/* Create Button (Moved to end) */}
                    <TouchableOpacity
                        style={[styles.folderChip, styles.createChip]}
                        onPress={() => setCreateModalVisible(true)}
                    >
                        <Plus color="#FFF" size={16} />
                        <Text style={styles.createChipText}>Créer</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={() => loadData(selectedFolderId)}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { borderColor: theme.colors.primary + '40', backgroundColor: theme.colors.primary + '20' }]}>
                                <Mail color={theme.colors.primary} size={40} />
                            </View>
                            <Text style={styles.emptyTitle}>Dossier vide</Text>
                            <Text style={styles.emptyText}>Aucun message dans ce dossier.</Text>
                        </View>
                    }
                />
            )}

            {/* Create Folder Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isCreateModalVisible}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Nouveau Dossier</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nom du dossier"
                            placeholderTextColor="#94A3B8"
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCreateFolder}
                                style={[styles.createButton, creatingFolder && { opacity: 0.7 }, { backgroundColor: theme.colors.primary }]}
                                disabled={creatingFolder}
                            >
                                {creatingFolder ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.createButtonText}>Créer</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10,
    },
    iconButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },

    // Folder Bar
    folderBarContainer: { height: 50, marginBottom: 5 },
    folderBar: { paddingHorizontal: 16, alignItems: 'center' },
    folderChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    activeChip: {
        // Dynamic styles moved to inline JSX
    },
    folderChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginLeft: 8 },
    activeChipText: { color: '#FFF' },
    createChip: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)', // Orange tint
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderStyle: 'dashed'
    },
    createChipText: { color: '#F59E0B', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },


    listContent: { padding: 16, paddingBottom: 100 },

    messageCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: "#000", shadowOpacity: 0, shadowRadius: 5, elevation: 1
    },
    unreadCard: {
        // Dynamic styles moved to inline JSX
    },
    avatarContainer: { marginRight: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

    messageContent: { flex: 1 },
    messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
    senderName: { color: '#E2E8F0', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 10 },
    dateText: { color: '#94A3B8', fontSize: 12 },

    subjectText: { color: '#CBD5E1', fontSize: 14, marginBottom: 6 },
    unreadText: { color: '#FFF', fontWeight: '700' },

    subInfo: { flexDirection: 'row', alignItems: 'center' },
    previewText: { color: '#64748B', fontSize: 13, flex: 1 },

    unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },

    emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.8 },
    emptyIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        borderWidth: 1
    },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    emptyText: { color: '#94A3B8', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: {
        width: '80%', backgroundColor: '#1E293B', borderRadius: 20, padding: 24,
        alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    input: {
        width: '100%', height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
        paddingHorizontal: 15, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    cancelButton: { padding: 12, flex: 1, alignItems: 'center' },
    cancelButtonText: { color: '#94A3B8', fontWeight: '600' },
    createButton: {
        padding: 12, flex: 1, alignItems: 'center', backgroundColor: '#8B5CF6', borderRadius: 12, marginLeft: 10
    },
    createButtonText: { color: '#FFF', fontWeight: 'bold' }
});
