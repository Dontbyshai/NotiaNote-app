import { useState, useEffect } from "react";
import { View, ActivityIndicator, TouchableOpacity, Text, Alert } from "react-native";
import { PressableScale } from "react-native-pressable-scale";
import { FileIcon, ExternalLinkIcon, DownloadIcon, TrashIcon } from "lucide-react-native";
// import FileViewer from "react-native-file-viewer";
import * as Sharing from 'expo-sharing';

import CustomChooser from "./CustomChooser";
import CustomSimpleInformationCard from "./CustomSimpleInformationCard";
import HomeworkHandler from "../../core/HomeworkHandler";
import { useGlobalAppContext } from "../../util/GlobalAppContext";
import { useCurrentAccountContext } from "../../util/CurrentAccountContext";
import StorageHandler from "../../core/StorageHandler";


// File attachment
function CustomFileAttachment({ file, windowWidth, deleteButton = false, onDelete, color }) {
  const { theme } = useGlobalAppContext();
  const { accountID } = useCurrentAccountContext();
  const accentColor = color || theme.colors.primary;

  const [isDownloading, setIsDownloading] = useState(false);
  async function openAttachment() {
    if (isDownloading) { return; }
    setIsDownloading(true);
    try {
      const { promise, localFile } = await HomeworkHandler.downloadHomeworkFile(accountID, file);
      await promise;
      // Use expo-sharing to open the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localFile);
      } else {
        alert("Le partage n'est pas disponible sur cet appareil");
      }
    } catch (e) {
      console.error("Open Attachment Error:", e);
      alert("Impossible d'ouvrir le fichier : " + e.message);
    } finally {
      setIsDownloading(false);
    }
  }

  const [fileExists, setFileExists] = useState(false);
  useEffect(() => { StorageHandler.dataExists(file.title).then(setFileExists); }, [isDownloading]);

  if (!fileExists) {
    return (
      <TouchableOpacity
        key={file.id}
        onPress={() => {
          openAttachment();
        }}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: 14,
          padding: 10,
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          marginBottom: 8,
        }}
      >
        <View style={{
          backgroundColor: accentColor + '1A',
          padding: 10,
          borderRadius: 10,
          marginRight: 12,
          borderWidth: 1,
          borderColor: accentColor + '33',
        }}>
          <FileIcon size={20} color={accentColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.dark ? '#F1F5F9' : '#1E293B', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{file.title}</Text>
          <Text style={{ color: theme.dark ? '#94A3B8' : '#64748B', fontSize: 11, marginTop: 1 }}>
            {isDownloading ? "Téléchargement..." : "Appuyer pour télécharger"}
          </Text>
        </View>

        <View style={{ padding: 8 }}>
          {isDownloading ? (
            <ActivityIndicator size={18} color={accentColor} />
          ) : (
            <DownloadIcon size={18} color={accentColor} />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        key={file.id}
        onPress={() => openAttachment()}
        onLongPress={() => {
          Alert.alert(
            "Options",
            "Voulez-vous supprimer ce fichier ?",
            [
              { text: "Annuler", style: "cancel" },
              {
                text: "Supprimer", style: "destructive", onPress: async () => {
                  await StorageHandler.deleteDocument(file.title);
                  setFileExists(false);
                  if (onDelete) { onDelete(); }
                }
              }
            ]
          );
        }}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.dark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.02)',
          borderRadius: 14,
          padding: 10,
          borderWidth: 1,
          borderColor: 'rgba(34, 197, 94, 0.15)',
          flex: 1
        }}
      >
        <View style={{
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          padding: 10,
          borderRadius: 10,
          marginRight: 12,
          borderWidth: 1,
          borderColor: 'rgba(34, 197, 94, 0.3)',
        }}>
          <FileIcon size={20} color="#22C55E" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.dark ? '#F1F5F9' : '#1E293B', fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{file.title}</Text>
          <Text style={{ color: '#22C55E', fontSize: 11, marginTop: 1 }}>
            Téléchargé • Maintenir pour options
          </Text>
        </View>

        <View style={{ padding: 8 }}>
          <ExternalLinkIcon size={18} color="#22C55E" />
        </View>
      </TouchableOpacity>

      {deleteButton && (
        <TouchableOpacity style={{
          padding: 12,
          backgroundColor: theme.colors.error,
          borderRadius: 12,
          marginLeft: 8,
          justifyContent: 'center', alignItems: 'center'
        }} onPress={async () => {
          await StorageHandler.deleteDocument(file.title);
          setFileExists(false);
          if (onDelete) { onDelete(); }
        }}>
          <TrashIcon size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default CustomFileAttachment;