import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system/legacy';


// Used to handle local storage
class StorageHandler {
  // Handle local data //

  // Ajoute un préfixe de plateforme à la clé pour séparer iOS et Android
  static getPlatformKey(fileName: string): string {
    return `${Platform.OS}_${fileName}`;
  }

  // Check if data exists
  static async dataExists(fileName: string): Promise<boolean> {
    const jsonData = await AsyncStorage.getItem(this.getPlatformKey(fileName));
    if (jsonData !== null) { return true; }

    const fileInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}files/${fileName}`);
    return fileInfo.exists;
  }

  // Save JSON data to file
  static async saveData(fileName: string, data: {}) {
    await AsyncStorage.setItem(this.getPlatformKey(fileName), JSON.stringify(data));
  }
  // Get JSON data from file
  static async getData(fileName: string): Promise<{} | null> {
    const platformKey = this.getPlatformKey(fileName);
    let data = await AsyncStorage.getItem(platformKey);

    // Migration automatique si pas de données avec le nouveau préfixe
    if (!data) {
      const oldData = await AsyncStorage.getItem(fileName);
      if (oldData) {
        console.log(`[StorageHandler] Migrating ${fileName} to platform-specific key`);
        await AsyncStorage.setItem(platformKey, oldData);
        data = oldData;
      }
    }

    return data ? JSON.parse(data) : null;
  }

  // Download and save documents
  static async downloadDocument(url: string, fileName: string, token: string): Promise<{ promise: Promise<FileSystem.FileSystemDownloadResult>, path: string }> {
    const folder = `${FileSystem.documentDirectory}files`;
    const localFile = `${folder}/${fileName}`;

    // Create folder if needed
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    }

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(localFile);
    if (fileInfo.exists) {
      console.log(`File ${fileName} already exists, skipping...`);
      // Return a fake promise-like object for compatibility if needed, but the caller likely awaits it.
      // Since the original returned a download promise, we should ideally handle this gracefully.
      // But for simplicity in this migration:
      return {
        promise: Promise.resolve({ uri: localFile, status: 200, headers: {}, mimeType: "image/jpeg" }),
        path: localFile,
      };
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localFile,
      { headers: { "X-Token": token, "User-Agent": process.env.EXPO_PUBLIC_ED_USER_AGENT } }
    );

    return {
      promise: downloadResumable.downloadAsync().then(result => {
        if (!result) throw new Error("Download failed");
        return result;
      }),
      path: localFile,
    };
  }

  // Save Base64 content to file
  static async saveBase64Document(base64Data: string, fileName: string): Promise<string> {
    const folder = `${FileSystem.documentDirectory}files`;
    const localFile = `${folder}/${fileName}`;

    // Create folder if needed
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    }

    await FileSystem.writeAsStringAsync(localFile, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    return localFile;
  }

  static async getAllDocuments(): Promise<string[]> {
    const folder = `${FileSystem.documentDirectory}files`;
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (!folderInfo.exists) return [];
    return FileSystem.readDirectoryAsync(folder);
  }


  // Clear data //

  // Clear local files
  static async deleteDocument(fileName: string) {
    const localFile = `${FileSystem.documentDirectory}files/${fileName}`;
    await FileSystem.deleteAsync(localFile, { idempotent: true });
  }
  static async deleteAllDocuments() {
    try {
      const folder = `${FileSystem.documentDirectory}files`;
      const folderInfo = await FileSystem.getInfoAsync(folder);
      if (folderInfo.exists) {
        await FileSystem.deleteAsync(folder, { idempotent: true });
      }
    } catch (e) {
      console.warn("An error occured while reading local documents : ", e);
    }
  }
  static async deleteFiles(fileNames: string[]) {
    for (const name of fileNames) {
      if (name === "profiles") {
        await this.deleteFolder("profiles", true); // profiles is in cache on Android, but we handle documentDir too
        // Also handle cacheDir specifically for profiles as used in CustomProfilePhoto
        const cacheDir = `${FileSystem.cacheDirectory}profiles/`;
        const info = await FileSystem.getInfoAsync(cacheDir);
        if (info.exists) {
          await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        }
      } else {
        await AsyncStorage.removeItem(this.getPlatformKey(name));
      }
    }
  }
  static async deleteFolder(folderName: string, isCache: boolean = false) {
    const base = isCache ? FileSystem.cacheDirectory : FileSystem.documentDirectory;
    const folder = `${base}${folderName}`;
    const folderInfo = await FileSystem.getInfoAsync(folder);
    if (folderInfo.exists) {
      await FileSystem.deleteAsync(folder, { idempotent: true });
    }
  }
  static async deleteAllFiles() {
    await AsyncStorage.clear();
  }
  static async clear() {
    await this.deleteAllFiles();
    await this.deleteAllDocuments();
  }
}

export default StorageHandler;