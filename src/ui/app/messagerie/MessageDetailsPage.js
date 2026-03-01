import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, Modal, FlatList, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, User, Paperclip, Download, FolderInput, AlertTriangle, X, Folder, Trash2, FolderOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

import EcoleDirecteApi from '../../../services/EcoleDirecteApi';
import { useCurrentAccountContext } from '../../../util/CurrentAccountContext';
import { useGlobalAppContext } from '../../../util/GlobalAppContext';
import { parseHtmlData } from '../../../util/Utils';

// Safe import for expo-sharing
let Sharing = null;
try {
    Sharing = require('expo-sharing');
} catch (e) {
    console.warn("ExpoSharing native module not found.");
}

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

// Component to render text with clickable links
const LinkifiedText = ({ text, style, theme }) => {
    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <Text style={style}>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    return (
                        <Text
                            key={index}
                            style={{ color: theme.colors.primary || '#3B82F6', textDecorationLine: 'underline' }}
                            onPress={() => {
                                Linking.openURL(part).catch(err => {
                                    Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
                                    console.error('Failed to open URL:', err);
                                });
                            }}
                        >
                            {part}
                        </Text>
                    );
                }
                return <Text key={index}>{part}</Text>;
            })}
        </Text>
    );
};

export default function MessageDetailsPage() {
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { theme } = useGlobalAppContext();
    const { accountID: contextAccountID, mainAccount } = useCurrentAccountContext();
    // Fix: Fallback to mainAccount.id if context ID is undefined
    const accountID = (contextAccountID && contextAccountID !== "undefined") ? contextAccountID : ((mainAccount?.id && mainAccount.id !== "undefined") ? mainAccount.id : null);
    const { message } = route.params || {};

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // --- Move to Folder State ---
    const [modalVisible, setModalVisible] = useState(false);
    const [folders, setFolders] = useState([]);
    const [foldersLoading, setFoldersLoading] = useState(false);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        if (message?.id) {
            loadContent();
            markAsRead();
        }
    }, [message]);

    const loadContent = async () => {
        try {
            const response = await EcoleDirecteApi.getMessageContent(accountID, message.id);
            if (response.status === 200 && response.data?.data) {
                const cleanContent = parseHtmlData(response.data.data.content);
                setContent(cleanContent);
            } else {
                setContent("Impossible de charger le contenu.");
            }
        } catch (e) {
            console.error(e);
            setContent("Erreur lors du chargement.");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        try {
            if (!message.read && !message.lu) {
                await EcoleDirecteApi.markAsRead(accountID, message.id);
            }
        } catch (e) {
            console.warn("Failed to mark as read", e);
        }
    }

    const handleDownload = async (file) => {
        if (downloading) return;
        setDownloading(true);
        try {
            console.log("[Download] Starting for file:", file.id, file.libelle);
            let base64data = null;
            let targetFile = null; // declared here so Strategy 2 can read its .type

            // Strategy 1: Get file content directly from getMessageContent
            // (This uses the already-working auth bridge and bypasses telechargement.awp)
            try {
                const msgResponse = await EcoleDirecteApi.getMessageContent(accountID, message.id);
                if (msgResponse?.data?.data) {
                    const messageData = msgResponse.data.data;
                    // EcoleDirecte can return files as 'files', 'fichiers', or inside content
                    const filesInMessage = messageData.files || messageData.fichiers || [];
                    console.log("[Download] Files in message content:", filesInMessage.length, "| IDs:", filesInMessage.map(f => f.id));
                    targetFile = filesInMessage.find(f => String(f.id) === String(file.id));
                    if (targetFile?.content) {
                        console.log("[Download] Found base64 in message content!");
                        base64data = targetFile.content;
                    } else {
                        console.log("[Download] File object keys:", targetFile ? Object.keys(targetFile) : "not found");
                    }
                }
            } catch (e) {
                console.warn("[Download] getMessageContent failed:", e.message);
            }

            // Strategy 2: Fallback to downloadAttachment if file not in message content
            if (!base64data) {
                // Use the actual file type returned by EcoleDirecte (e.g. PIECE_JOINTE)
                const fileType = targetFile?.type || file?.type || "PIECE_JOINTE";
                console.log("[Download] File not in content, trying downloadAttachment API with type:", fileType);
                base64data = await EcoleDirecteApi.downloadAttachment(file.id, fileType, false, String(accountID || ""));
            }

            if (!base64data) {
                throw new Error("Aucune donnée reçue.");
            }

            // Check for HTML Error Page inside Base64
            if (base64data.length < 5000) {
                try {
                    const text = Buffer.from(base64data, 'base64').toString('utf-8');
                    if (text.includes('<html') || text.includes('Login') || text.includes('"code":')) {
                        console.log("[Download] Content looks like error/html:", text.substring(0, 100));
                        Alert.alert("Erreur Fichier", "Le fichier téléchargé est invalide (Page Erreur/Login).");
                        setDownloading(false);
                        return;
                    }
                } catch (e) { /* ignore decode error */ }
            }

            const safeName = (file.libelle || file.name || `doc_${file.id}`).replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const path = `${FileSystem.documentDirectory}${safeName}`;

            console.log("[Download] Writing file to:", path);
            await FileSystem.writeAsStringAsync(path, base64data, { encoding: FileSystem.EncodingType.Base64 });

            console.log("[Download] Opening share sheet...");

            if (Sharing && await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(path);
            } else {
                Alert.alert("Info", "Le partage de fichier n'est pas disponible ou le module natif est manquant.");
            }

        } catch (e) {
            console.error("Download Error:", e);
            Alert.alert("Erreur", e.message || "Téléchargement échoué.");
        } finally {
            setDownloading(false);
        }
    };

    const openMoveModal = async () => {
        setModalVisible(true);
        setFoldersLoading(true);
        try {
            const res = await EcoleDirecteApi.getMessages(accountID, 'received');
            let fetchedFolders = [];
            if (res.status === 200 && res.data?.data?.classeurs) {
                fetchedFolders = res.data.data.classeurs;
            }
            const allFolders = [{ id: 0, libelle: "Reçus (Boîte de réception)" }, ...fetchedFolders];
            setFolders(allFolders);
        } catch (e) {
            console.error("Fetch folders error", e);
            Alert.alert("Erreur", "Impossible de charger les dossiers.");
        } finally {
            setFoldersLoading(false);
        }
    };

    const handleDeleteFolder = (folder) => {
        Alert.alert(
            "Supprimer le dossier",
            `Voulez-vous vraiment supprimer le dossier "${folder.libelle}" ?`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await EcoleDirecteApi.deleteMessageFolder(folder.id);
                            if (res.status === 200) {
                                openMoveModal();
                            } else {
                                Alert.alert("Erreur", "Impossible de supprimer le dossier.");
                            }
                        } catch (e) {
                            Alert.alert("Erreur", "Une erreur est survenue.");
                        }
                    }
                }
            ]
        );
    };

    const handleMoveToFolder = async (folder) => {
        if (moving) return;
        setMoving(true);
        try {
            const res = await EcoleDirecteApi.moveMessage(accountID, message.id, folder.id);
            if (res.status === 200) {
                setModalVisible(false);
                Alert.alert("Succès", `Message déplacé vers "${folder.libelle}"`, [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Erreur", "Impossible de déplacer le message.");
            }
        } catch (e) {
            console.error("Move error", e);
            Alert.alert("Erreur", "Une erreur est survenue.");
        } finally {
            setMoving(false);
        }
    };

    if (!message) return null;

    const sender = message.from?.name || message.from?.nom || "Inconnu";
    const subject = message.subject || message.objet || "Sans objet";
    const filesCount = message.files ? message.files.length : 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient colors={[theme.colors.primaryLight || theme.colors.primary || '#000', theme.colors.background]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ChevronLeft color={theme.colors.onBackground} size={28} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.onBackground }]} numberOfLines={1}>Détail Message</Text>
                <TouchableOpacity onPress={openMoveModal} style={[styles.iconButton, { backgroundColor: theme.colors.primary + '33' }]}>
                    <FolderInput color={theme.colors.primary} size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.metaCard}>
                    <Text style={[styles.subject, { color: theme.colors.onBackground }]}>{subject}</Text>
                    <View style={styles.senderRow}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.avatarText}>{sender.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={[styles.senderName, { color: theme.colors.onSurface || theme.colors.onBackground }]}>{sender}</Text>
                            <Text style={styles.date}>{formatDate(message.date)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.bodyCard}>
                    {loading ? (
                        <ActivityIndicator color={theme.colors.primary} />
                    ) : (
                        <LinkifiedText text={content || "Aucun contenu."} style={[styles.bodyText, { color: theme.colors.onBackground }]} theme={theme} />
                    )}
                </View>

                <View style={{ height: 20 }} />

                <View style={styles.attachmentsContainer}>
                    <Text style={styles.sectionTitle}>Pièces jointes ({filesCount})</Text>
                    {filesCount > 0 ? (
                        message.files.map((file, index) => (
                            <TouchableOpacity key={index} style={styles.attachmentButton} onPress={() => handleDownload(file)} disabled={downloading}>
                                <View style={[styles.attachmentIcon, { backgroundColor: theme.colors.primary + '33' }]}>
                                    {downloading ? (
                                        <ActivityIndicator color={theme.colors.primary} size="small" />
                                    ) : (
                                        <Paperclip color={theme.colors.onBackground} size={20} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.attachmentName, { color: theme.colors.onBackground }]} numberOfLines={1}>{file.libelle || file.name || "Fichier sans nom"}</Text>
                                    <Text style={{ color: '#64748B', fontSize: 10 }}>{file.id || "ID Manquant"}</Text>
                                </View>
                                <Download color="#94A3B8" size={20} />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.debugBox}>
                            <AlertTriangle color="#F59E0B" size={20} />
                            <Text style={styles.debugText}>Aucune pièce jointe détectée.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.colors.onBackground }]}>Déplacer vers un dossier</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X color="#94A3B8" size={24} />
                            </TouchableOpacity>
                        </View>

                        {foldersLoading ? (
                            <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 20 }} />
                        ) : (
                            <FlatList
                                data={folders}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ padding: 10 }}
                                ListEmptyComponent={
                                    <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>
                                        Aucun dossier trouvé.
                                    </Text>
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.folderRow}>
                                        <TouchableOpacity
                                            style={styles.folderItem}
                                            onPress={() => handleMoveToFolder(item)}
                                            disabled={moving}
                                        >
                                            <View style={styles.folderIcon}>
                                                {item.id === 0 ? <FolderOpen color="#3B82F6" size={20} /> : <Folder color="#F59E0B" size={20} />}
                                            </View>
                                            <Text style={[styles.folderName, { color: theme.colors.onBackground }]}>{item.libelle}</Text>
                                        </TouchableOpacity>

                                        {item.id > 0 && (
                                            <TouchableOpacity
                                                style={styles.deleteFolderButton}
                                                onPress={() => handleDeleteFolder(item)}
                                            >
                                                <Trash2 color="#EF4444" size={18} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </BlurView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10,
    },
    iconButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' },

    content: { padding: 20, paddingBottom: 40 },

    metaCard: {
        marginBottom: 20,
    },
    subject: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
    senderRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    senderName: { fontSize: 16, color: '#E2E8F0', fontWeight: '600' },
    date: { fontSize: 12, color: '#94A3B8' },

    attachmentsContainer: { marginBottom: 20 },
    sectionTitle: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', marginBottom: 10, fontWeight: 'bold' },
    attachmentButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
        padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    attachmentIcon: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(139, 92, 246, 0.2)',
        justifyContent: 'center', alignItems: 'center', marginRight: 10
    },
    attachmentName: { color: '#FFF', fontSize: 14, fontWeight: '500' },

    bodyCard: {
        backgroundColor: Platform.select({ android: 'rgba(255,255,255,0.05)', ios: 'transparent' }),
        padding: 20, borderRadius: 16,
        minHeight: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    bodyText: { color: '#E2E8F0', fontSize: 16, lineHeight: 24 },

    debugBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    debugText: { color: '#F59E0B', marginLeft: 10, fontSize: 14 },

    // Modal Styles
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: '60%', minHeight: 300,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
    },
    modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    folderRow: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between'
    },
    folderItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12
    },
    deleteFolderButton: {
        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, marginLeft: 10,
        borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    folderIcon: { marginRight: 15 },
    folderName: { color: '#E2E8F0', fontSize: 16, fontWeight: '500' }
});
